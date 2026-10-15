# Higgsfield MCP: แกะโครงสร้าง tools

ตรวจเมื่อ 2026-10-15 จาก connector Higgsfield ที่ต่อกับ Claude อยู่ อ่านจาก schema ของทุก tool และเรียก tool แบบอ่านอย่างเดียว 3 ครั้ง (`models_explore`, `get_workflow_instructions`, `generate_image` แบบ `get_cost: true` ซึ่งไม่สร้างงานและไม่เสียเครดิต) ไม่ได้สั่ง generate จริง

## ภาพรวม

ประมาณ 117 tools แบ่งเป็น 3 ชั้น:

1. **แกนกลาง** (~25 tools): generate, ส่งไฟล์เข้า, รอผล, แคตตาล็อกโมเดล, เครดิต
2. **tool เฉพาะงาน** (~10 tools): upscale, outpaint, reframe, ลบพื้นหลัง, motion control, dubbing, เปลี่ยนเสียง
3. **studio และแพลตฟอร์ม** (~80 tools): Ads Studio, AI Influencer, Shorts Studio, Marketing Studio, Katana, 3D Jutsu (Blender บนคลาวด์), website builder + deploy, sandbox Linux (ffmpeg), โพสต์ TikTok, marketplace ของแอป, virality predictor, workspace/project/folder, ขายแพ็กเกจ/ทดลองใช้ฟรี

ชั้น 3 คือสิ่งที่ทำให้มันเป็น "แพลตฟอร์ม" ไม่ใช่ thin client และอยู่นอก scope ของเราตาม CLAUDE.md

## รูปแบบการออกแบบที่เจอ

### 1. generate ตัวเดียวต่อชนิดสื่อ, พารามิเตอร์เปิดกว้าง

`generate_image`, `generate_video`, `generate_audio`, `generate_3d` รับ `params` ก้อนเดียว:

- `model` (บังคับ) + `prompt`
- `medias: [{ role, value }]` โดย role ขึ้นกับโมเดล (`image`, `start_image`, `end_image`, `video`, `audio`) และ value เป็น **ID เท่านั้น** ("Do not pass https:// URLs here")
- พารามิเตอร์เฉพาะโมเดลใส่ที่ระดับบนสุดได้เลย (`additionalProperties: {}`) แล้วให้ไปดูว่าแต่ละโมเดลรับอะไรจาก `models_explore`
- `params` เป็น `anyOf [object, string]` คือรับ JSON ที่ถูก stringify มาด้วย (กันกรณี client บางตัวส่ง object เป็น string)
- `count` 1–4 สำหรับแบบต่างๆ ของ prompt เดียวกัน, ส่วนงานที่ต่างกันใช้ `generate_*_batch` (1–12 งานพร้อมกัน, ไม่เปิด widget)

ของเรา: แยก tool ตามงาน (`start_video`, `motion_control`, `edit_video`, …) และใช้ชื่อพารามิเตอร์ตายตัว (`image_url`, `end_image_url`, `reference_urls`)

### 2. แคตตาล็อกโมเดลที่บอก "วิธีเรียก" ด้วย

`models_explore` (list / search / get / recommend) คืนต่อโมเดล:

```json
{ "id": "cinematic_studio_3_0", "parameters": [{ "name": "resolution", "options": ["480p","720p","1080p","4k"], "default": "720p" }],
  "medias": [{ "type": "image", "roles": ["image","start_image","end_image"] }],
  "aspect_ratios": ["auto","21:9","16:9", "..."], "duration_range": { "min": 4, "max": 15 } }
```

มี `recommend` ที่รับเป้าหมาย + ชนิดอินพุตแล้วแนะนำโมเดล และใน description ของ generate เขียน **โมเดลตั้งต้น** ไว้ตรงๆ เช่น "Default general image model: gpt_image_2_5", "seedance_2_5 for general video, kling3_0 for multi-shot"

ของเรา: `list_models` คืน id | type | capabilities | price บรรทัดเดียว ไม่มีพารามิเตอร์ที่รับ, ความยาวที่รองรับ หรือโมเดลแนะนำ

### 3. ไฟล์เข้าเป็น ID, ผลลัพธ์ต่อยอดได้

- `media_upload` คืน presigned PUT URL → client PUT ไฟล์เอง → `media_confirm` ได้ `media_id`
- `media_import_url` ดึงไฟล์จาก https URL มาเก็บแล้วคืน `media_id` (สูงสุด 50 MB)
- `media_upload_widget` เป็น UI ให้ผู้ใช้เลือกไฟล์ (ใช้เมื่อ client อ่านไฟล์เองไม่ได้)
- **job_id ของงานที่เสร็จแล้วใช้เป็นอินพุตได้ทันที** (`medias[].value` รับ job_id) จึงต่อ image → video → upscale ได้โดยไม่ต้องส่งลิงก์ไปมา

ของเรา: รับ https URL ตรงๆ และลิงก์ Blob ที่เราคืนก็ใช้ต่อได้อยู่แล้ว ข้อดีของแบบเราคือไม่ต้องมีขั้น upload

### 4. งานยาว: ส่งแล้วรอแบบ long-poll

- `jobs_wait` รับ 1–12 job, รอสูงสุด 15 วินาทีต่อครั้ง, คืนสถานะทุกตัวพร้อม `poll_after_seconds`
- `show_generation_by_ids` แสดงผลรวมทีเดียวสูงสุด 60 งาน

ของเรา: `get_video` เช็คทีละ job และบอกให้กลับมาใหม่ใน 30 วินาที

### 5. เงินและความปลอดภัยของการกดซ้ำ

- **`get_cost: true`** บนทุก generate: คืนราคาโดยไม่สร้างงาน (ลองแล้ว: `gpt_image_2_5` = 0.25 เครดิต)
- งานแพง (Ads Studio, AI Influencer) ใช้สองจังหวะ: quote → ผู้ใช้อนุมัติ → generate พร้อม `max_credits` / `expected_credits` และ server ตีราคาใหม่ก่อนตัดเงิน ถ้าราคาเปลี่ยนจะปฏิเสธ
- `idempotency_key` / `requestId` ให้ส่งค่าเดิมเมื่อ retry
- ทุก generate เขียนว่า "On a transport timeout the submission outcome may be unknown: do not automatically resubmit"
- `use_unlim` และ `use_free_gens` ให้ server ถามผู้ใช้ก่อนว่าจะใช้โควตาฟรีหรือเครดิต

### 6. server ช่วยแก้ให้แทนที่จะ error

- `adjustments`: ถ้าค่าที่ส่งมาโมเดลไม่รับ (เช่น duration) server ปัดเป็นค่าที่ใกล้ที่สุดแล้วบอกว่าปรับอะไร
- `recovery_tool`: ถ้าพลาด server บอกชื่อ tool ที่ควรเรียกต่อ (เช่นเครดิตหมดก็ชี้ไปหน้าซื้อ) และ description สั่งให้เรียกทันทีโดยไม่ต้องถาม

### 7. ส่ง "ความรู้" ไปกับ server

- `get_workflow_instructions` คืน SKILL.md ทั้งไฟล์ (มี 13 workflow เช่น ugc-video, thumbnail-generation, product-photoshoot) พร้อมไฟล์อ้างอิงผ่าน `get_workflow_bundle_file`
- `get_preset_instructions` แปลง slash command (`/hero-shot`, `/katana/...`) เป็นสูตร
- MCP server instructions ยาวมาก กำหนด routing ระหว่าง tool

คือเขาย้าย prompt engineering และขั้นตอนการทำงานไปไว้ฝั่ง server ทำให้แก้ได้โดยไม่ต้องให้ผู้ใช้อัปเดตอะไร

### 8. widget (MCP Apps UI)

`show_*` หลายตัวเปิด UI ในแชท (แกลเลอรี, ฟอร์ม preset, หน้าซื้อเครดิต, อัดเสียงสร้าง voice) และหลาย flow ตั้งใจให้ผู้ใช้กดใน widget แทนให้โมเดลตัดสินใจเอง

### 9. เก็บข้อมูลผู้ใช้

- ทุก generate มีพารามิเตอร์ `context`: "Briefly describe the user's underlying goal… Analytics only" คือให้โมเดลเขียนสรุปเจตนาผู้ใช้ส่งไปให้เขา
- `sync_agents` สั่งให้โมเดลรวบรวม skills ของผู้ใช้และ "personality dump" แล้วอัปโหลดขึ้น Higgsfield

## เทียบกับของเรา

| ความสามารถ | Higgsfield | เรา (v1) |
| --- | --- | --- |
| text | ไม่มี | `generate_text` |
| image / edit / upscale | ✓ (+ outpaint, ลบพื้นหลัง) | ✓ |
| video t2v / i2v / ref / motion / edit / extend / upscale | ✓ (+ reframe) | ✓ |
| speech / transcribe | speech, voice clone, voice change, dubbing | speech, transcribe |
| 3D | ✓ | ไม่ทำ (ไม่มีโมเดล 3D บน Gateway) |
| ราคาก่อนสั่ง | `get_cost` ทุก generate | ราคาอยู่ใน `list_models` เท่านั้น |
| batch / รอหลายงาน | `*_batch` + `jobs_wait` | ทีละงาน |
| พารามิเตอร์ต่อโมเดล | `models_explore get` | ไม่มี |
| กันกดซ้ำ | idempotency key + คำเตือน timeout | ไม่มี |
| ไฟล์ของผู้ใช้ | ID + upload/import | https URL + `list_files` |
| ยอดใช้งาน | `balance`, `transactions` | `check_credits` |
| studio / เว็บ / TikTok / sandbox | ✓ | ไม่ทำ (ผิด scope และ AUP ของ Vercel) |

## ที่ควรยืมมา (อยู่ใน scope, ไม่ต้องเพิ่ม dependency)

เรียงจากคุ้มสุด:

1. **`estimate_only` บน generate_image / start_video และเครื่องมือวิดีโอ**: คำนวณจาก `pricing` ใน `/v1/models` ที่เราโหลดอยู่แล้ว (`image_dimension_quality_pricing`, `video_duration_pricing`) ไม่ต้องเรียก Gateway ช่วยให้ chat app บอกราคาก่อนเผาเครดิต โดยเฉพาะวิดีโอ
2. **คำเตือน timeout ใน description ของ tool ที่สร้างงาน**: "ถ้า call หมดเวลา อย่าส่งซ้ำอัตโนมัติ ให้ดู `list_files` ก่อน" แก้แค่ข้อความ แต่กันจ่ายซ้ำได้
3. **`get_video` รับหลาย job_id** (สูงสุด ~12) คืนสถานะทุกตัวในครั้งเดียว ลดรอบการ poll ตอนสั่งหลายคลิป
4. **`list_models` แบบละเอียดเมื่อถามโมเดลเดียว**: คืน duration / aspect / resolution ที่รองรับ (ถ้า `/v1/models` มีข้อมูลนี้ ต้องตรวจก่อน) และใส่โมเดลแนะนำต่อประเภทไว้ใน description
5. **`adjustments` สำหรับค่าที่ปัดได้**: เช่น duration เกินที่โมเดลรับ ให้ปัดลงแล้วบอก แต่ **ห้าม** ปัดข้าม `MAX_VIDEO_SECONDS` เพราะ CLAUDE.md กำหนดให้เป็นเพดานที่ error
6. **MCP server instructions สั้นๆ**: บอก flow ต่อกัน (generate_image → ใช้ลิงก์ใน start_video → get_video) และโมเดลตั้งต้นต่อประเภท

## ที่ไม่ควรยืม

- studio ทั้งหมด, 3D, website builder, sandbox, โพสต์ TikTok: CLAUDE.md ตัดออกแล้ว และ AUP ของ Vercel ห้ามทำสินค้าที่แข่งกับ Gateway
- ระบบเครดิต/แพ็กเกจ/ทดลองใช้ฟรีของตัวเอง: เราไม่ถือเงินใคร เงินไปที่ Gateway ตรง
- พารามิเตอร์ `context` และ `sync_agents`: เก็บเจตนาและข้อมูลส่วนตัวของผู้ใช้ ขัดกับจุดขายว่าเราไม่เห็นอะไรของใคร
- `recovery_tool` ที่สั่งให้เรียกต่อ "โดยไม่ต้องถาม": โยงไปหน้าซื้อของ ไม่เข้ากับโปรเจกต์นี้
- media ID + ขั้น upload: เพิ่ม state และ round trip, ลิงก์ https ของเราใช้ได้ดีกว่าสำหรับ thin client
- widget: น่าสนใจสำหรับ v2 แต่เพิ่มงานเยอะ และ ChatGPT/Claude รองรับไม่เท่ากัน
