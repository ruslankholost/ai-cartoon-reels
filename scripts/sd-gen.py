# Local SDXL frames: python -I scripts/sd-gen.py <checkpoint> <out_dir> <jobs.json> [lora] [weight]
# Run with E:/Invoke/.venv/Scripts/python.exe; peft lives in .pylibs (uv pip install --target .pylibs --no-deps peft).
import sys, json, time, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".pylibs"))
import torch
sys.stdout.reconfigure(encoding='utf-8')
from diffusers import StableDiffusionXLPipeline, EulerAncestralDiscreteScheduler
ckpt, out_dir, jobs_file = sys.argv[1], sys.argv[2], sys.argv[3]
pipe = StableDiffusionXLPipeline.from_single_file(ckpt, torch_dtype=torch.float16)
pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(pipe.scheduler.config)
lora = sys.argv[4] if len(sys.argv) > 4 else None
if lora:
    import os
    from safetensors.torch import load_file
    # kohya LoRAs trained on the whole UNet also carry label_emb / time_embed / out_2 / conv_in / text_projection keys that
    # diffusers cannot map; they are dropped (the style lives in the attention and resnet blocks)
    skip = ("label_emb", "time_embed", "unet_out_2", "input_blocks_0_0", "text_projection")
    pipe.load_lora_weights({k: v for k, v in load_file(lora).items() if not any(x in k for x in skip)}, adapter_name="style")
    pipe.set_adapters(["style"], adapter_weights=[float(sys.argv[5]) if len(sys.argv) > 5 else 0.9])
jobs = json.load(open(jobs_file, encoding='utf-8'))
# Jobs with "init" (a picture path) and "strength" redraw that picture instead of starting from noise; one mode per run.
if jobs[0].get("init"):
    from diffusers import StableDiffusionXLImg2ImgPipeline
    from PIL import Image
    pipe = StableDiffusionXLImg2ImgPipeline(**pipe.components)
pipe.enable_model_cpu_offload()
for j in jobs:
    t = time.time()
    size = {"image": Image.open(j["init"]).convert("RGB"), "strength": j["strength"]} if j.get("init") else {"width": 768, "height": 1344}
    img = pipe(prompt=j["p"], negative_prompt=j["n"], num_inference_steps=28, **size,
               guidance_scale=j.get("cfg", 5.5), generator=torch.Generator("cuda").manual_seed(j["seed"])).images[0]
    img.save(f"{out_dir}/{j['name']}.png")
    print(j["name"], f"{time.time()-t:.1f}s", flush=True)
