#!/usr/bin/env python3
import json
import os
import sys
import time
from vastai import VastAI

STATE_FILE = ".mineru_instance.json"
CACHE_FILE = ".mineru_cached_host.json"


def parse_sdk_output(res):
    if isinstance(res, str):
        try:
            return json.loads(res)
        except json.JSONDecodeError:
            return res
    return res


def main():
    vast = VastAI()

    if not os.path.exists(STATE_FILE):
        print(f"❓ No active instance tracking file ('{STATE_FILE}') found.")
        instance_id = input(
            "Enter Instance ID to destroy (or press Enter to cancel): "
        ).strip()
        if not instance_id:
            sys.exit(0)
        machine_id = None
    else:
        with open(STATE_FILE, "r") as f:
            state = json.load(f)
        instance_id = state.get("instance_id")
        machine_id = state.get("machine_id")
        elapsed_min = (time.time() - state.get("started_at", time.time())) / 60
        print(
            f"Found active instance #{instance_id} on host #{machine_id} (Ran for ~{elapsed_min:.1f} mins)"
        )

    # Preserve host cache info before destroying
    if machine_id:
        with open(CACHE_FILE, "w") as f:
            json.dump({"machine_id": machine_id, "last_used": time.time()}, f, indent=2)
        print(f"💾 Saved host #{machine_id} to cache file ('{CACHE_FILE}').")

    print(f"🛑 Destroying instance #{instance_id} to stop all billing...")
    res = parse_sdk_output(vast.destroy_instance(id=int(instance_id)))

    if res and res.get("success"):
        print(f"✅ Instance #{instance_id} destroyed.")
        print(
            f"💡 Next time you run start_mineru.py, it will check host #{machine_id} first for fast cached booting."
        )
        if os.path.exists(STATE_FILE):
            os.remove(STATE_FILE)
    else:
        print(f"⚠️  Response from Vast.ai: {res}")
        if os.path.exists(STATE_FILE):
            os.remove(STATE_FILE)


if __name__ == "__main__":
    main()
