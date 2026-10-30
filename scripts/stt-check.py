# whisper large-v3 (CPU int8) transcripts of audio files: python -I scripts/stt-check.py file.mp3 [more files]
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('HF_HUB_OFFLINE', '1')
from audiolib import decode
from faster_whisper import WhisperModel
model = WhisperModel('large-v3', device='cpu', compute_type='int8')
for f in sys.argv[1:]:
    audio = decode(f, 16000)
    segs, info = model.transcribe(audio, word_timestamps=True, beam_size=5, language='en', condition_on_previous_text=False)
    words = [(w.word.strip(), round(w.start, 2), round(w.end, 2)) for s in segs for w in s.words]
    print(os.path.basename(f), '|', ' '.join(w for w, _, _ in words))
