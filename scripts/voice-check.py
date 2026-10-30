# Whisper large-v3 (CPU int8) check: is every scripted word heard, and nothing extra (a spoken [tag])?
#   E:/talking-reel/.venv/Scripts/python.exe -I scripts/voice-check.py <audio> [<audio> ...]
# Expected text: the "text" in the take's sidecar .json (raw takes), else that file's words in public/<episode>/timings.json without the bleeped ones;
# out/<episode>-table-read.mp3 is checked against all lines joined, a cast/ sample against that character's lines. Exit code 1 if any file has a missing or extra word.
import difflib, glob, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('HF_HUB_OFFLINE', '1')
from audiolib import decode
from faster_whisper import WhisperModel

ROOT = os.path.normpath(os.path.join(HERE, '..'))


def timings(path):
    """the timings.json a built file belongs to: public/<episode>/<nn>-<char>.mp3, public/<episode>/cast/*.mp3 or out/<episode>-table-read.mp3"""
    d, b = os.path.dirname(os.path.abspath(path)), os.path.basename(path)
    if b.endswith('-table-read.mp3'): d = os.path.join(ROOT, 'public', b[:-len('-table-read.mp3')])
    elif os.path.basename(d) == 'cast': d = os.path.dirname(d)
    return json.load(open(os.path.join(d, 'timings.json'), encoding='utf-8'))


def said(t):
    return ' '.join(w['d'] for w in t['words'] if not w.get('bleep'))


ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = '- - twenty thirty forty fifty sixty seventy eighty ninety'.split()
def spell(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ('' if n % 10 == 0 else ' ' + ONES[n % 10])
    if n < 1000: return ONES[n // 100] + ' hundred' + ('' if n % 100 == 0 else ' ' + spell(n % 100))
    if 1100 <= n < 2000 and n % 100: return spell(n // 100) + ' ' + spell(n % 100)   # a year: 1949 is "nineteen forty nine"
    return ONES[n // 1000] + ' thousand' + ('' if n % 1000 == 0 else ' ' + spell(n % 1000))


def norm(s):
    s = s.lower().replace('\u2019', "'")
    s = re.sub(r'\w*\*+\w*', ' ', s)   # Whisper writes a bleeped swear as "F***": the tone is not a word
    s = re.sub(r'\bmm+[\s-]*h?m+\b|\bmhm+\b|\buh[\s-]*huh\b', 'mmhm', s)   # "Mm-hm" / "Mm-hmm" / "Mhm" are one token
    s = re.sub(r'\$\s?(\d+)\s?\.\s?(\d\d)\b', lambda m: f'{spell(int(m[1]))} {spell(int(m[2]))}', s)   # "$4 .99" is "four ninety nine"
    s = re.sub(r'(?<=\d)\s?,(?=\d{3}\b)', '', s)   # "9,000" (the words are joined with spaces: "9 ,000") is "9000"
    s = re.sub(r'\b\d{1,4}\b', lambda m: spell(int(m[0])), s)   # Whisper writes numbers as digits ("40", "80", "2", "300", "1949", "9,000")
    s = re.sub(r'\bwanna\b', 'want to', s); s = re.sub(r'\broundup\b', 'round up', s); s = re.sub(r'\bsalesperson\b', 'sales person', s); s = re.sub(r"(?<![a-z])'em\b", 'them', s)   # "wanna" as "want to", "round up" as "roundup", "sales person" as "salesperson", "'em" as "them"
    s = re.sub(r"\bma\s+'am\b", "ma'am", s)   # Whisper writes "Ma'am" as "Ma 'am"
    s = re.sub(r"(\w)'s\b", r'\1s', s)   # "Diamond's" and "Diamonds", "kit's" and "kits" sound the same
    return re.findall(r"[a-z0-9]+(?:'[a-z0-9]+)*", s)


def expected(path):
    side = os.path.splitext(path)[0] + '.json'
    if os.path.exists(side): return json.load(open(side, encoding='utf-8'))['text']
    tj = timings(path)['takes']
    if os.path.basename(path).endswith('-table-read.mp3'): return ' '.join(said(t) for t in tj)
    if os.path.basename(os.path.dirname(os.path.abspath(path))) == 'cast':   # cast/<char>-<cast|runnerup>-<voice>.mp3 = that character's lines in order
        ch = os.path.basename(path).split('-')[0]
        return ' '.join(said(t) for t in tj if t['file'].endswith(f'-{ch}.mp3'))
    return said(next(t for t in tj if t['file'].endswith(os.path.basename(path))))


def pieces(audio, path):
    """the table read goes through Whisper in chunks cut in the silences between lines (<= 20 s each): in one 35 s pass its long-form mode drops a final backchannel like Mm-hm"""
    if not os.path.basename(path).endswith('-table-read.mp3'): return [audio]
    cues = timings(path)['tableRead']['cues']
    cuts, start = [], 0.0
    for a, b in zip(cues, cues[1:]):
        if b['speech'][1] - start > 20.0:
            start = (a['speech'][1] + b['speech'][0]) / 2
            cuts.append(int(start * 16000))
    return [audio[i:j] for i, j in zip([0] + cuts, cuts + [len(audio)])]


model = WhisperModel('large-v3', device='cpu', compute_type='int8')
bad = 0
for f in sys.argv[1:]:
    ws = [w for part in pieces(decode(f, 16000), f) for s in model.transcribe(part, word_timestamps=True, beam_size=5, language='en', condition_on_previous_text=False)[0] for w in s.words]
    heard = ' '.join(w.word.strip() for w in ws)
    exp, got = norm(expected(f)), norm(heard)
    miss, extra = [], []
    for op, a0, a1, b0, b1 in difflib.SequenceMatcher(None, exp, got).get_opcodes():
        if op in ('delete', 'replace'): miss += exp[a0:a1]
        if op in ('insert', 'replace'): extra += got[b0:b1]
    bad += bool(miss or extra)
    print(f"{'OK  ' if not (miss or extra) else 'DIFF'} {os.path.basename(os.path.dirname(f))}/{os.path.basename(f)} | p {sum(w.probability for w in ws) / max(1, len(ws)):.2f} | heard: {heard}" + (f" | missing {miss} extra {extra}" if miss or extra else ""), flush=True)
sys.exit(1 if bad else 0)
