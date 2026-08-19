import asyncio
import json
import logging

logger = logging.getLogger(__name__)

class VastService:
    @staticmethod
    async def run_vast_cmd(cmd: str):
        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            error_msg = stderr.decode().strip()
            logger.error(f"Vast.ai CLI Error: {error_msg}")
            raise Exception(f"Command failed with return code {process.returncode}: {error_msg}")
            
        # Vastai CLI often outputs informational messages to stderr even on success,
        # but the JSON data we want is usually on stdout.
        output = stdout.decode().strip()
        return output

    @staticmethod
    async def search_instances(gpu_type="RTX_3090"):
        """Search for cheap instances"""
        cmd = f'vastai search offers "gpu_name={gpu_type} mdgpu=false rented=false" -o "dlperf_usd-" --raw'
        output = await VastService.run_vast_cmd(cmd)
        try:
            offers = json.loads(output)
            return offers
        except json.JSONDecodeError:
            raise Exception(f"Failed to parse search output: {output}")

    @staticmethod
    async def create_instance(offer_id: int, image="pytorch/pytorch:latest"):
        """Create an instance from an offer ID"""
        # The --raw flag makes vastai return a JSON dict like {"success": true, "new_contract": <id>}
        cmd = f'vastai create instance {offer_id} --image {image} --disk 32 --raw'
        output = await VastService.run_vast_cmd(cmd)
        try:
            result = json.loads(output)
            return result
        except json.JSONDecodeError:
            raise Exception(f"Failed to parse create output: {output}")

    @staticmethod
    async def destroy_instance(instance_id: int):
        """Destroy an instance"""
        cmd = f'vastai destroy instance {instance_id} --raw'
        output = await VastService.run_vast_cmd(cmd)
        try:
            result = json.loads(output)
            return result
        except json.JSONDecodeError:
            raise Exception(f"Failed to parse destroy output: {output}")
