#!/usr/bin/env python3
import json
import os
import re
import sys
import time
from vastai import VastAI

# ==============================================================================
# Hardware & Instance Configuration
# ==============================================================================
MIN_GPU_RAM_GB = 12
MIN_CPU_RAM_GB = 16
DISK_SIZE_GB = 100
MIN_INET_DOWN_MBPS = 100  # Minimum 100 Mbps host download speed
TEMPLATE_HASH = "46867b592aebb754120cc8cd5ef4b03f"

STATE_FILE = ".mineru_instance.json"  # Tracks currently active instance
CACHE_FILE = ".mineru_cached_host.json"  # Remembers host with cached Docker image

PORT_SERVICE_LABELS = {
    "7860/tcp": "Gradio Web UI",
    "7860": "Gradio Web UI",
    "8000/tcp": "FastAPI Backend",
    "8000": "FastAPI Backend",
    "8002/tcp": "MinerU Router",
    "8002": "MinerU Router",
    "22/tcp": "SSH",
    "22": "SSH",
    "8080/tcp": "HTTP Service",
    "8888/tcp": "Jupyter Notebook",
}


def parse_sdk_output(res):
    """Normalize SDK return values across raw strings, dicts, and lists."""
    if isinstance(res, str):
        try:
            return json.loads(res)
        except json.JSONDecodeError:
            return res
    return res


def get_instance_info(vast, instance_id):
    """Safely fetch and unwrap instance details dictionary."""
    try:
        raw = vast.show_instance(id=instance_id)
        info = parse_sdk_output(raw)
        if isinstance(info, dict) and "instances" in info:
            info = info["instances"]
        if isinstance(info, list) and len(info) > 0:
            info = info[0]
        return info if isinstance(info, dict) else {}
    except Exception:
        return {}


def get_port_mappings(info):
    """Extract and format all public endpoint mappings from the instance info."""
    public_ip = info.get("public_ipaddr") or info.get("ssh_host") or ""
    ports_map = info.get("ports") or {}
    mappings = []

    if isinstance(ports_map, dict) and public_ip:
        for container_port, host_entries in ports_map.items():
            if isinstance(host_entries, list):
                for entry in host_entries:
                    if isinstance(entry, dict) and "HostPort" in entry:
                        host_port = entry["HostPort"]
                        service_name = PORT_SERVICE_LABELS.get(
                            container_port,
                            PORT_SERVICE_LABELS.get(
                                container_port.split("/")[0], "Custom Service"
                            ),
                        )
                        mappings.append(
                            {
                                "endpoint": f"http://{public_ip}:{host_port}",
                                "container_port": container_port,
                                "service": service_name,
                            }
                        )
    return mappings


def find_best_offer(vast):
    """Check preferred cached host first; fall back to market search."""
    # 1. Try previously used machine where Docker image is already cached
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                cached_data = json.load(f)
            cached_machine_id = cached_data.get("machine_id")

            if cached_machine_id:
                print(
                    f"🎯 Checking availability of previous host #{cached_machine_id} (Docker image cached)..."
                )
                cached_query = f"machine_id={cached_machine_id} disk_space>={DISK_SIZE_GB} rentable=true"
                raw_offers = vast.search_offers(query=cached_query, order="dph_total")
                offers = parse_sdk_output(raw_offers)

                if offers and isinstance(offers, list) and len(offers) > 0:
                    best = offers[0]
                    print(
                        f"⚡ Host #{cached_machine_id} is available! Launching with local image cache..."
                    )
                    return best
                else:
                    print(
                        f"ℹ️  Host #{cached_machine_id} is currently occupied or offline."
                    )
        except Exception:
            pass

    # 2. Fall back to marketplace search with requirements
    print("🔍 Searching marketplace for cheapest GPU meeting specs...")
    print(
        f"   • GPU VRAM >= {MIN_GPU_RAM_GB} GB | "
        f"System RAM >= {MIN_CPU_RAM_GB} GB | "
        f"Disk >= {DISK_SIZE_GB} GB | "
        f"Download >= {MIN_INET_DOWN_MBPS} Mbps"
    )

    search_query = (
        f"gpu_ram>={MIN_GPU_RAM_GB} "
        f"cpu_ram>={MIN_CPU_RAM_GB} "
        f"disk_space>={DISK_SIZE_GB} "
        f"inet_down>={MIN_INET_DOWN_MBPS} "
        f"rentable=true"
    )

    raw_offers = vast.search_offers(query=search_query, order="dph_total")
    offers = parse_sdk_output(raw_offers)

    if not offers or not isinstance(offers, list):
        print("❌ No matching available instances found at the moment.")
        sys.exit(1)

    return offers[0]


def main():
    vast = VastAI()
    instance_id = None
    dph = 0.0

    # Reconnect if already running
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            state = json.load(f)
        saved_id = state.get("instance_id")
        dph = state.get("dph", 0.0)

        info = get_instance_info(vast, saved_id)
        cur_status = str(
            info.get("actual_status") or info.get("cur_state") or ""
        ).lower()

        if cur_status in ["running", "loading"]:
            print(f"🔄 Reconnecting to active instance #{saved_id}...")
            instance_id = saved_id
        else:
            os.remove(STATE_FILE)

    # Provision new instance if none active
    if not instance_id:
        best_offer = find_best_offer(vast)
        offer_id = best_offer["id"]
        machine_id = best_offer.get("machine_id")
        gpu_name = best_offer.get("gpu_name", "GPU")
        inet_down = best_offer.get("inet_down", 0)
        dph = best_offer.get("dph_total", 0.0)

        print(
            f"✅ Selected Offer #{offer_id} (Host #{machine_id}): {gpu_name} @ ${dph:.4f}/hr (Down: {inet_down:.0f} Mbps)"
        )

        print(f"🚀 Provisioning instance using template '{TEMPLATE_HASH}'...")
        create_res = parse_sdk_output(
            vast.create_instance(
                id=offer_id,
                template_hash=TEMPLATE_HASH,
                disk=DISK_SIZE_GB,
                label="mineru-gradio",
            )
        )

        instance_id = (
            create_res.get("new_contract") if isinstance(create_res, dict) else None
        )

        if not instance_id:
            print(f"❌ Failed to create instance: {create_res}")
            sys.exit(1)

        print(f"🎉 Instance created successfully! (Instance ID: {instance_id})")

        # Save active instance state
        state = {
            "instance_id": instance_id,
            "machine_id": machine_id,
            "offer_id": offer_id,
            "gpu_name": gpu_name,
            "dph": dph,
            "started_at": time.time(),
        }
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)

        # Update cached host record
        with open(CACHE_FILE, "w") as f:
            json.dump(
                {
                    "machine_id": machine_id,
                    "gpu_name": gpu_name,
                    "last_used": time.time(),
                },
                f,
                indent=2,
            )

    # Poll status and stream logs until ready
    print("\n⏳ Initializing instance...")
    last_log_line = ""
    gradio_live_url = None

    start_time = time.time()
    while True:
        elapsed = int(time.time() - start_time)
        info = get_instance_info(vast, instance_id)

        status = str(info.get("actual_status") or info.get("cur_state") or "loading")
        status_msg = str(info.get("status_msg") or "")

        if status.lower() in ["exited", "offline"]:
            print(
                f"\n❌ Container stopped unexpectedly: status='{status}' ({status_msg})"
            )
            print("Run 'python stop_mineru.py' to clean up resources.")
            sys.exit(1)

        sys.stdout.write(
            f"\r⏱️  [{elapsed}s] Status: {status.upper()} | {status_msg[:45]}   "
        )
        sys.stdout.flush()

        if status.lower() == "running":
            try:
                raw_logs = vast.logs(id=instance_id, tail=25)
                logs = parse_sdk_output(raw_logs)
                if isinstance(logs, dict):
                    logs = logs.get("logs", "") or logs.get("result", "") or str(logs)

                if isinstance(logs, str):
                    gradio_matches = re.findall(
                        r"https://[a-zA-Z0-9-]+\.gradio\.live", logs
                    )
                    if gradio_matches:
                        gradio_live_url = gradio_matches[-1]

                    lines = [ln.strip() for ln in logs.splitlines() if ln.strip()]
                    if lines and lines[-1] != last_log_line:
                        last_log_line = lines[-1]
                        print(f"\n[Log] {last_log_line}")
            except Exception:
                pass

            port_mappings = get_port_mappings(info)
            if port_mappings or gradio_live_url:
                break

        time.sleep(5)

    # Display Endpoints
    port_mappings = get_port_mappings(info)
    ssh_host = info.get("ssh_host") or info.get("public_ipaddr", "unknown")
    ssh_port = info.get("ssh_port", "unknown")

    print("\n" + "=" * 70)
    print("✨ MINERU INSTANCE IS READY FOR USE!")
    print("=" * 70)

    if port_mappings:
        print("\n🌐 Exposed Endpoints & Services:")
        print(f"{'External URL / Address':<36} {'Port':<12} {'Service'}")
        print("-" * 70)
        for p in port_mappings:
            print(f"{p['endpoint']:<36} {p['container_port']:<12} {p['service']}")
        print("-" * 70)

    if gradio_live_url:
        print(f"\n🔗 Gradio Public Share URL: {gradio_live_url}")

    print(f"\n💻 Direct SSH:            ssh -p {ssh_port} root@{ssh_host}")
    print(f"💰 Cost Rate:             ${dph:.4f}/hr")
    print(f"🛑 To destroy & stop:     python stop_mineru.py")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
