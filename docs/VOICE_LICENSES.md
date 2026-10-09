# Catalyst OS — Voice Licensing & Compliance Notice

## 1. Open Source Licensing Analysis

Catalyst OS is designed to preserve architectural and licensing integrity.

### VoiceStudio Application License
- **License**: **AGPL-3.0** (GNU Affero General Public License v3.0).
- **Compliance Requirement**: The AGPL-3.0 requires that anyone modifying or distributing the software, or offering it over a network as a modified service, must provide the source code of the modified software under the AGPL-3.0.
- **Catalyst OS Architectural Isolation**:
  - Catalyst OS **does not** import, vendor, link, or incorporate any AGPL-3.0 source code.
  - Catalyst OS treats Voice Studio strictly as an **independent external network service** communicating over standard HTTP REST (`/v1/audio/*`) and WebSocket APIs.
  - This network boundary strictly prevents copyleft propagation into Catalyst's proprietary or Apache-2.0 core modules.

---

## 2. Integrated Model & Engine Licenses

| Engine / Component | License | Notes & Restrictions |
| :--- | :--- | :--- |
| **OmniVoice Model** | Apache-2.0 | Permissive commercial use with attribution. |
| **CosyVoice 3** | Apache-2.0 | Permissive commercial use. |
| **WhisperX / Faster-Whisper** | MIT / Apache-2.0 | Permissive open source. |
| **GPT-SoVITS** | MIT | Permissive open source. |
| **PocketTTS** | CC-BY-4.0 | Non-exclusive, requires attribution, gated download. |
| **IndexTTS 2.5** | Bilibili Model License | Free up to 100M MAU / RMB 1B revenue; enterprise commercial license above. |

---

## 3. Privacy & Attribution

- Voice Studio copyright: `Copyright (c) 2024-2026 debpalash and VoiceStudio contributors`.
- All model weights remain under their respective upstream licenses.
- No copyrighted model weights are stored in the Catalyst repository.
