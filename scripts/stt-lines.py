# Every line of the reel, heard in the FINAL mix: cut each line's window out of the audio, transcribe it with whisper and
# compare with the script. python -I scripts/stt-lines.py <audio or video file> [scratch/cues.json]
import difflib, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('HF_HUB_OFFLINE', '1')
from audiolib import decode
from faster_whisper import WhisperModel

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = json.load(open(sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, 'scratch', 'cues.json'), encoding='utf-8'))
x = decode(sys.argv[1], 16000)
model = WhisperModel('large-v3', device='cpu', compute_type='int8')
ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = '- - twenty thirty forty fifty sixty seventy eighty ninety'.split()
def spell(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ('' if n % 10 == 0 else ' ' + ONES[n % 10])
    if n < 1000: return ONES[n // 100] + ' hundred' + ('' if n % 100 == 0 else ' ' + spell(n % 100))
    if 1100 <= n < 2000 and n % 100: return spell(n // 100) + ' ' + spell(n % 100)   # a year: 1949 is "nineteen forty nine"
    return ONES[n // 1000] + ' thousand' + ('' if n % 1000 == 0 else ' ' + spell(n % 1000))


# The same spellings as scripts/voice-check.py norm() (a copy: that script runs Whisper as soon as it is imported). Whisper writes numbers as digits ("40", "300", "1949", "9,000", "$4.99" as "4 99"),
# "wanna" as "want to", "round up" as "roundup", "'em" for "them", "sales person" as "salesperson", "Diamond's" as "Diamonds", and a bleeped swear as "F***": all are the same words
def norm(s):
    s = s.lower().replace('’', "'")
    s = re.sub(r'\w*\*+\w*', ' ', s)   # the bleep tone
    s = re.sub(r'\bmm+[\s-]*h?m+\b|\bmhm+\b|\buh[\s-]*huh\b', 'mmhm', s)   # "Mm-hm" / "Mm-hmm" / "Mhm" are one token
    s = re.sub(r'\$\s?(\d+)\s?\.\s?(\d\d)\b', lambda m: f'{spell(int(m[1]))} {spell(int(m[2]))}', s)   # "$4 .99" is "four ninety nine"
    s = re.sub(r'(?<=\d)\s?,(?=\d{3}\b)', '', s)   # "9,000" is "9000"
    s = re.sub(r'\b\d{1,4}\b', lambda m: spell(int(m[0])), s)
    s = re.sub(r'\bwanna\b', 'want to', s); s = re.sub(r'\broundup\b', 'round up', s); s = re.sub(r'\bsalesperson\b', 'sales person', s); s = re.sub(r"(?<![a-z])'em\b", 'them', s)
    s = re.sub(r"(\w)'s\b", r'\1s', s)
    s = re.sub(r'\ba{2,}nd\b', 'and', s); s = re.sub(r'\b(check|ice)(out|bath)\b', r'\1 \2', s)   # x08/x09: a drawn-out "Aaand..." is "and"; Whisper writes "checkout" as "check out" and, under a boom, "ICE BATH" as "Icebath"
    s = re.sub(r'\bhi{2,}\b', 'hi', s); s = re.sub(r'\bah{2,}\b', 'ah', s); s = re.sub(r'\bleg[\s-]+room', 'legroom', s)   # x17: a drawn-out "Hiii!" and "Ahh." are "hi" and "ah"; Whisper writes "Legroom" as "Leg room" and "Legroom's" as "Leg rooms"
    return re.findall(r"[a-z0-9]+(?:'[a-z0-9]+)*", s)


bad = 0
for i, v in enumerate(J['voices']):
    a = max(0.0, v['at'] + v['first'] - 0.2); b = min(len(x) / 16000, v['at'] + v['end'] + 0.2)
    seg = x[int(a * 16000): int(b * 16000)]
    segs, _ = model.transcribe(seg, beam_size=5, language='en', condition_on_previous_text=False, no_speech_threshold=0.9, log_prob_threshold=-2.0, vad_filter=False)
    heard = ' '.join(s.text.strip() for s in segs)
    want = ' '.join(w['d'] for w in v['words'] if not w.get('bleep')) if any(w.get('bleep') for w in v.get('words', [])) else v['text']   # a bleeped word is a tone in the mix: not expected
    if re.fullmatch(r"m+[ -]*h?m+\.?", want.lower().replace('-', ' ').strip().replace(' ', '')) or want.lower().startswith('mm'):
        ok = bool(re.search(r'\bm+\s*h?m+\b|\bmm', heard.lower().replace('-', ' ')))
        ratio = 1.0 if ok else 0.0
    else:
        w, h = norm(want), norm(heard)
        ratio = sum(m.size for m in difflib.SequenceMatcher(None, w, h).get_matching_blocks()) / len(w)  # share of the script that was heard, in order
    flag = 'ok ' if ratio >= 0.8 else 'BAD'
    bad += ratio < 0.8
    print(f"{flag} {i + 1:2d} {v['who']:6s} {a:5.1f}-{b:5.1f}  {ratio:4.2f}  want: {want}  |  heard: {heard}")
print('all lines heard' if not bad else f'{bad} line(s) not heard')
