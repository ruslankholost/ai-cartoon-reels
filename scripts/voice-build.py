# E:/talking-reel/.venv/Scripts/python.exe -I scripts/voice-build.py <episode>
#   -> public/<episode>/<nn>-<char>.mp3 + timings.json (+ cast/<char>-<cast|runnerup>-<voice>.mp3 when the episode has runner-up takes),
#      and out/<episode>-table-read.mp3
# Takes one raw take per line (the episode's plan), optionally slows it a little and opens a short pause at a phrase boundary (the cut sits at the
# quietest point between two words), trims, levels every line to the same loudness, and writes the word timings of the FINAL audio.
# ElevenLabs' own word times are right inside a line but its first-word start can be late by up to 0.4 s and its last-word end runs 0.2 s long,
# so the first word moves back to the first stretch of real pitched speech just before it (a sleepy grunt before the words does not count), and the last ends with the speech.
# A bleeped word goes under a tone in the line file itself, so every later mix carries the bleep.
# Then the lines are laid out with comedic gaps for the table read, with the episode's tableSfx under them, master about -16 LUFS.
# Episode file: episodes/<episode>.jsonc (lines, cast, runnerUp, plan, gaps, lead, tableSfx). Raw takes: scratch/voice-raw/<episode> (voice-gen.mjs).
import glob, json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.stdout.reconfigure(encoding='utf-8')
import numpy as np
from audiolib import SR, decode, envelope, segments, loudness, write_wav, f0_track

ROOT = os.path.normpath(os.path.join(HERE, '..'))
EP_NAME = sys.argv[1]
EP = json.loads(re.sub(r'(?m)^\s*//.*$', '', open(os.path.join(ROOT, 'episodes', EP_NAME + '.jsonc'), encoding='utf-8').read()))
RAW = os.path.join(ROOT, 'scratch', 'voice-raw', EP_NAME)
OUT = os.path.join(ROOT, 'public', EP_NAME)
TABLE = os.path.join(ROOT, 'out', f'{EP_NAME}-table-read.mp3')
LINE_LUFS, TABLE_LUFS = -19.0, -16.0     # every line file is leveled alike (same as the truck); the table read is mastered hotter
LEAD, TAIL = 0.06, 0.25                  # room kept around the speech in each line file (s)
NAMES = {'dave': 'DAVE', 'barb': 'BARB', 'linda': 'LINDA', 'chad': 'CHAD', 'phone': "CHAD'S PHONE", 'phantom': 'PHANTOM', 'sarah': 'SARAH', 'lisa': 'LISA', 'chuck': 'CHUCK', 'denise': 'DENISE', 'tony': 'TONY', 'voicemail': 'VOICEMAIL', 'agency': 'AGENCY GUY', 'marco': 'MARCO', 'wife': "RICK'S WIFE", 'gary': 'GARY', 'kyle': 'KYLE', 'machine': 'MACHINE', 'attendant': 'ATTENDANT', 'lily': 'LILY', 'cashier': 'CASHIER', 'rhonda': 'RHONDA', 'brandon': 'BRANDON', 'guest1': 'GUEST 1', 'guest2': 'GUEST 2', 'guest3': 'GUEST 3', 'customer': 'CUSTOMER', 'todd': 'TODD', 'ross': 'ROSS', 'guru': 'GURU', 'tyler': 'TYLER', 'landlord': 'LANDLORD', 'supplier': 'SUPPLIER', 'accountant': 'ACCOUNTANT', 'guy': 'GUY', 'kenzie': 'KENZIE', 'mom': 'MOM', 'bride': 'BRIDE', 'groom': 'GROOM', 'fa': 'FLIGHT ATTENDANT', 'pilot': 'PILOT', 'grandpa': 'GRANDPA', 'kid1': 'TODDLER', 'kid2': 'KID', 'kid3': 'KID', 'camper': 'CAMPER', 'dev1': 'GUY 1', 'dev2': 'GUY 2', 'dev3': 'GUY 3'}
ORDER = [(l['n'], l['char']) for l in EP['lines']]

CAST = EP['cast']                 # which candidate plays the part (the number in the raw folder name, see voice-gen.mjs)
RUNNER = EP.get('runnerUp', {})   # and who is the runner-up, for the cast samples
# plan: line -> raw take number t, tempo rate (1 = as spoken; below 1 only for a rushed take), pauses [[after word index, extra silence in s]],
# from = raw-take second before which nothing is kept (a breath in front of the line), to = raw-take second after which nothing is kept (a word cut off on purpose, no breath after it), bleep [word index], pitch = a pitch ratio that turns an adult take into a kid's voice (tempo kept), alt = take used for the runner-up's cast sample when the cast take does not exist or reads a word wrong for that voice
PLAN = {int(n): p for n, p in EP['plan'].items()}
for _p in PLAN.values():
    _p.setdefault('rate', 1.0); _p.setdefault('pauses', []); _p.setdefault('bleep', [])
# gaps: silence between the last spoken sound of line n and the first of line n+1 (s); lead: where the first line's speech starts
GAPS = {int(n): g for n, g in EP['gaps'].items()}
SAMPLE_GAP = 0.5


def ffpipe(args, x):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-'] + args + ['-f', 'f32le', '-ar', str(SR), '-ac', '1', '-'], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def write_mp3(path, y, kbps):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp.wav'
    write_wav(tmp, y)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', '-ar', str(SR), '-ac', '1', '-map_metadata', '-1', path], check=True)
    os.remove(tmp)


def write_leveled(path, y, kbps, target, limit=0.89):
    """encode, decode again and measure; the mp3 round trip costs about 0.3 dB, so re-level until the file itself sits on the target"""
    y0, aim = y, target
    for _ in range(3):
        y = master(y0, aim, limit)
        write_mp3(path, y, kbps)
        got = loudness(decode(path))[0]
        if abs(got - target) < 0.1: break
        aim += target - got
    return y, got


def quietest(env, hop, a, b):
    i0, i1 = max(0, int(a / hop)), min(len(env), int(b / hop))
    return (i0 + int(np.argmin(env[i0:i1]))) * hop


def level(y, target):
    """gain to the target loudness; a peak above 0.89 goes through a limiter instead of turning the whole line down"""
    y = y * 10 ** ((target - loudness(y)[0]) / 20)
    if np.max(np.abs(y)) > 0.89:
        y = ffpipe(['-af', 'alimiter=limit=0.89:attack=3:release=40:level=0'], y)
    return y


def pitched_starts(f0, hop=0.01, min_len=0.15, bridge=0.04):
    """start times of stretches (gaps up to 40 ms bridged) that have a pitch for at least 150 ms"""
    out, i, n = [], 0, len(f0)
    while i < n:
        if f0[i] <= 0: i += 1; continue
        j = last = i
        while j < n and (f0[j] > 0 or j - last <= int(bridge / hop)):
            if f0[j] > 0: last = j
            j += 1
        if (last - i + 1) * hop >= min_len: out.append(i * hop)
        i = j
    return out


def master(mix, target, ceil=0.84):
    """gain to the target loudness, limiter on the peaks, and again until the limited signal sits on the target"""
    for _ in range(8):
        mix = mix * 10 ** ((target - loudness(mix)[0]) / 20)
        if np.max(np.abs(mix)) > ceil: mix = ffpipe(['-af', f'alimiter=limit={ceil}:attack=3:release=40:level=0'], mix)
        if abs(loudness(mix)[0] - target) < 0.1: break
    return mix


def edit(x, words, rate, pauses):
    """slow down (rate < 1) and/or open pauses; returns audio and the source->new time map"""
    env, hop = envelope(x, SR, hop=0.005, win=0.015)
    cuts = []
    for i, p in pauses:
        cuts.append((quietest(env, hop, max(words[i]['t'] + 0.05, words[i + 1]['t'] - 0.14), words[i + 1]['t'] + 0.01), p))
    edges = [0.0] + [c for c, _ in cuts] + [len(x) / SR]
    pieces, spans, off, f = [], [], 0.0, int(0.006 * SR)
    for k in range(len(edges) - 1):
        seg = x[int(edges[k] * SR):int(edges[k + 1] * SR)].copy()
        if k > 0: seg[:f] *= np.linspace(0, 1, f)
        if k < len(edges) - 2: seg[-f:] *= np.linspace(1, 0, f)
        if abs(rate - 1) > 1e-6: seg = ffpipe(['-af', f'atempo={rate}'], seg)
        spans.append((edges[k], edges[k + 1], off, len(seg) / SR))
        pieces.append(seg); off += len(seg) / SR
        if k < len(cuts):
            pieces.append(np.zeros(int(cuts[k][1] * SR), dtype=np.float32)); off += cuts[k][1]
    return np.concatenate(pieces), spans


def tmap(t, spans):
    for a, b, off, ln in spans:
        if t < b or (a, b, off, ln) == spans[-1]:
            return off + (t - a) * ln / (b - a)


def render(char, cand, n, take, rate=1.0, pauses=(), skip=0.0, until=None, pitch=1.0):
    d = glob.glob(os.path.join(RAW, f'{char}-{cand}-*'))[0]
    base = os.path.join(d, f'L{n:02d}-t{take}')
    meta = json.load(open(base + '.json', encoding='utf-8'))
    words = meta['words']
    x, spans = edit(decode(base + '.mp3'), words, rate, pauses)
    if abs(pitch - 1) > 1e-6: x = ffpipe(['-af', f'rubberband=pitch={pitch}'], x)   # rubberband keeps the length; the speech moves < 0.02 s
    segs = segments(*envelope(x, SR, hop=0.005, win=0.015), thr_db=-40, min_len=0.03, merge=0.03)
    start = max(0.0, segs[0][0] - LEAD)
    if skip: start = max(start, tmap(skip, spans) - LEAD)
    end = min(len(x) / SR, segs[-1][1] + TAIL)
    if until: end = min(end, tmap(until, spans))
    y = x[int(start * SR):int(end * SR)].copy()
    f = int(0.004 * SR)
    y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    y = level(y, LINE_LUFS)
    segs = segments(*envelope(y, SR, hop=0.005, win=0.015), thr_db=-40, min_len=0.03, merge=0.03)
    # word onsets: the aligner's, carried through the edit. The first word moves back to the first >= 0.15 s stretch of pitched speech that starts
    # up to 0.6 s before the aligner's time (a sleepy grunt before the words has no pitch, so it does not count). An onset that lands in a silence snaps to the speech after it.
    male = char in ('dave', 'chad', 'cashier', 'brandon')
    on = [tmap(w['t'], spans) - start for w in words]
    near = [t for t in pitched_starts(f0_track(y, lo=65 if male else 100, hi=250 if male else 450)) if on[0] - 0.6 <= t <= on[0] + 0.15]
    on[0] = max(0.0, near[0] - 0.03) if near else on[0]
    for i in range(1, len(on)):
        if not any(r0 - 0.08 <= on[i] <= r1 for r0, r1 in segs):
            nxt = [r0 for r0, _ in segs if on[i] <= r0 <= on[i] + 0.25]
            if nxt: on[i] = nxt[0]
        on[i] = max(on[i], on[i - 1])
    out = []
    for i, w in enumerate(words):
        b = on[i + 1] if i + 1 < len(words) else len(y) / SR
        run = next((r1 for r0, r1 in segs if r0 - 0.08 <= on[i] <= r1), None)
        out.append(dict(w=w['w'], d=w['d'], t=round(float(on[i]), 3), e=round(float(min(run, b) if run else min(on[i] + 0.1, b)), 3)))
    return dict(y=y, meta=meta, words=out, segs=segs, source=os.path.basename(d) + '/' + os.path.basename(base), rate=rate)


def short(meta):
    return meta['voice'].split(' ')[0]


def voice_of(char, cand):
    return json.load(open(glob.glob(os.path.join(RAW, f'{char}-{cand}-*', 'L*-t1.json'))[0], encoding='utf-8'))


def who(char, cand):
    m = voice_of(char, cand)
    return dict(voice=short(m), voiceId=m['voiceId'], account_name=m['voice'])


def bleep(r, idx):
    """each listed word goes under a 1 kHz tone about as loud as the word, from 80 ms before its onset (the f of a swear starts early) to the next word's onset
    (a last word: to the end of the speech, so a shouted tail cannot stick out after the tone)"""
    y, ws = r['y'], r['words']
    for i in idx:
        w = ws[i]
        a, b = int(max(0.0, min(w['t'] - 0.08, r['segs'][0][0]) if i == 0 else w['t'] - 0.08) * SR), int((ws[i + 1]['t'] if i + 1 < len(ws) else r['segs'][-1][1]) * SR)
        tone = 0.7 * np.sqrt(2 * np.mean(y[a:b] ** 2)) * np.sin(2 * np.pi * 1000 * np.arange(b - a) / SR)
        f = int(0.005 * SR)
        tone[:f] *= np.linspace(0, 1, f); tone[-f:] *= np.linspace(1, 0, f)
        y[a:b] = tone
        w['bleep'] = True
    return r


def place(mix, x, at):
    assert at >= 0, f'a clip would start at {at:.2f} s: raise "lead"'
    i = int(round(at * SR))
    mix[i:i + len(x)] += x[:len(mix) - i]


def main():
    chars = list(dict.fromkeys(c for _, c in ORDER))
    if RUNNER:
        os.makedirs(os.path.join(OUT, 'cast'), exist_ok=True)
        for old in glob.glob(os.path.join(OUT, 'cast', '*.mp3')): os.remove(old)   # a re-cast must not leave the old samples behind
    takes, rend = [], {}
    for n, char in ORDER:
        p = PLAN[n]
        r = rend[n] = bleep(render(char, CAST[char], n, p['t'], p['rate'], p['pauses'], p.get('from', 0.0), p.get('to'), p.get('pitch', 1.0)), p['bleep'])
        fn = f'{n:02d}-{char}.mp3'
        r['y'], got = write_leveled(os.path.join(OUT, fn), r['y'], 160, LINE_LUFS)
        m = r['meta']
        takes.append(dict(id=f'l{n:02d}', n=n, file=f'{EP_NAME}/{fn}', character=NAMES[char], voice=short(m), voiceId=m['voiceId'], text=m['text'], say=m['say'], source=r['source'], tempo=r['rate'],
                          dur=round(len(r['y']) / SR, 3), end=round(float(r['segs'][-1][1]), 3), words=r['words'], voiced=[[round(float(a), 3), round(float(b), 3)] for a, b in r['segs']]))
        print(f"{n:2d} {char:<5} {short(m):<8} {r['source']:<24} dur {len(r['y']) / SR:5.2f}  speech {r['segs'][0][0]:.2f}-{r['segs'][-1][1]:.2f}  file lufs {got:6.1f}  {m['text']}")

    # the table read: each line's first/last spoken sound sits GAPS apart, the sounds sit off a line's speech start or end
    t0, pos, cues, prev = EP.get('lead', 0.10), None, [], None   # (a gap is keyed by the line before it, so line numbers need not run 1, 2, 3 ...)
    for n, char in ORDER:
        r = rend[n]
        a, b = r['segs'][0][0], r['segs'][-1][1]
        at = (t0 if pos is None else pos + GAPS[prev]) - a
        cues.append(dict(n=n, at=round(at, 3), speech=[round(at + a, 3), round(at + b, 3)]))
        pos, prev = at + b, n
    sfx = []
    for s in EP.get('tableSfx', []):
        c = next(c for c in cues if c['n'] == s['line'])
        x = decode(os.path.join(ROOT, 'public', 'sfx', s['sfx'] + '.mp3')) * 10 ** (s.get('gain', 0.0) / 20)
        sfx.append(dict(sfx=s['sfx'], at=round(c['speech'][0 if s.get('from') == 'start' else 1] + s.get('off', 0.0), 3), x=x))
    mix = np.zeros(int(max([pos + 0.3] + [s['at'] + len(s['x']) / SR for s in sfx]) * SR), dtype=np.float32)
    for s in sfx: place(mix, s.pop('x'), s['at'])
    for c in cues: place(mix, rend[c['n']]['y'], c['at'])
    write_leveled(TABLE, mix, 192, TABLE_LUFS, 0.84)
    chk = decode(TABLE)
    lufs, tp = loudness(chk)
    print(f"table read  {len(chk) / SR:.2f}s  {lufs:.1f} LUFS  true peak {tp} dBFS")
    lines_lufs = [loudness(decode(os.path.join(OUT, f'{n:02d}-{c}.mp3')))[0] for n, c in ORDER]
    assert max(lines_lufs) - min(lines_lufs) < 0.5, f'lines are not loudness-matched: {lines_lufs}'
    assert abs(lufs - TABLE_LUFS) < 0.3, f'table read is {lufs} LUFS'

    # a short sample per candidate: that character's lines in the same takes, same plan
    for char in (c for c in chars if c in RUNNER):
        for cand in (CAST[char], RUNNER[char]):
            ys = []
            for n, c in ORDER:
                if c != char: continue
                p = PLAN[n]
                y = rend[n]['y'] if cand == CAST[char] else bleep(render(char, cand, n, p.get('alt', p['t']), p['rate'], p['pauses'], p.get('from', 0.0), None, p.get('pitch', 1.0)), p['bleep'])['y']
                ys += [y, np.zeros(int(SAMPLE_GAP * SR), dtype=np.float32)]
            write_leveled(os.path.join(OUT, 'cast', f"{char}-{'cast' if cand == CAST[char] else 'runnerup'}-{short(voice_of(char, cand)).lower()}.mp3"), np.concatenate(ys[:-1]), 160, LINE_LUFS)

    cast = {NAMES[c]: dict(cast=who(c, CAST[c]), **({'runnerUp': who(c, RUNNER[c])} if c in RUNNER else {})) for c in chars}
    json.dump(dict(model='eleven_v4', target_lufs=LINE_LUFS, cast=cast, takes=takes,
                   tableRead=dict(file=os.path.relpath(TABLE, ROOT).replace('\\', '/'), dur=round(len(chk) / SR, 3), lufs=round(lufs, 1), gaps=GAPS, cues=cues, sfx=sfx)),
              open(os.path.join(OUT, 'timings.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print('written', os.path.join(OUT, 'timings.json'))


if __name__ == '__main__':
    main()
