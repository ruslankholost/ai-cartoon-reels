# Trims, fades and levels the raw sound clips in public/sfx-src into the clips the mix uses (public/sfx/<name>.mp3).
#   E:/talking-reel/.venv/Scripts/python.exe -I scripts/sfx-build.py [name ...]     (no names = every clip)
# Sources: ElevenLabs sound-generation clips (made here, scripts/sfx-gen.mjs) and a few from an earlier video project (ours).
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from audiolib import decode, SR

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(root, 'public', 'sfx-src')
dst = os.path.join(root, 'public', 'sfx')
os.makedirs(dst, exist_ok=True)

# name: (source file, from s, to s, fade-in s, fade-out s, ('peak'|'rms', dBFS))
PLAN = {
    'burst':    ('burst',  0.0, 2.0, 0.002, 0.25, ('peak', -3)),
    'buzz':     ('buzz',   0.0, 0.55, 0.004, 0.06, ('peak', -9)),
    'whoosh':   ('whoosh', 0.0, 0.5, 0.003, 0.12, ('peak', -6)),
    'thud':     ('thud',   0.0, 0.6, 0.002, 0.12, ('peak', -3)),
    'blub':     ('blub',   0.0, 1.0, 0.003, 0.12, ('peak', -6)),
    'ding':     ('ding',   0.0, 0.8, 0.002, 0.2, ('peak', -8)),
    'engine':   ('engine', 0.0, 1.1, 0.04, 0.3, ('peak', -6)),
    'splash':   ('splash', 0.0, 0.6, 0.002, 0.12, ('peak', -4)),
    'clank':    ('clonk',  0.0, 0.6, 0.002, 0.1, ('peak', -3)),
    'glug':     ('glug',   0.0, 1.3, 0.005, 0.2, ('peak', -6)),
    'flip':     ('flip',   0.28, 0.62, 0.004, 0.06, ('peak', -6)),
    'pop':      ('pop',    0.0, 0.2, 0.002, 0.05, ('peak', -8)),
    'wipe':     ('wipe',   0.0, 0.55, 0.01, 0.12, ('peak', -10)),
    'snore':    ('snore',  0.0, 2.2, 0.15, 0.35, ('peak', -8)),
    'tick':     ('click',  0.02, 0.12, 0.002, 0.03, ('peak', -10)),
    'rain':     ('rain',   0.0, 6.0, 0.3, 0.3, ('rms', -24)),
    'spraybed': ('spray',  0.05, 1.2, 0.05, 0.05, ('rms', -28)),
    # episode 2 "Be Chad"
    'ring':     ('ring',     0.0, 0.8, 0.002, 0.08, ('peak', -8)),
    'tape':     ('tape',     0.4, 1.2, 0.03, 0.08, ('peak', -6)),
    'rip':      ('rip',      0.0, 0.4, 0.002, 0.06, ('peak', -4)),
    'shower':   ('shower',   0.0, 2.8, 0.15, 0.3, ('rms', -28)),
    'zap':      ('zap',      0.0, 0.75, 0.002, 0.1, ('peak', -4)),
    'school':   ('school',   0.0, 3.3, 0.1, 0.03, ('rms', -30)),    # the cut-off end is the gag: the singing stops on "STOP FLUSHING"
    'drill':    ('drill',    0.0, 1.2, 0.02, 0.06, ('peak', -10)),
    'flush':    ('flush',    0.0, 1.8, 0.01, 0.4, ('peak', -4)),
    'gurgle':   ('gurgle',   0.0, 2.0, 0.01, 0.4, ('peak', -4)),
    'squelch':  ('squelch',  0.0, 0.9, 0.005, 0.1, ('peak', -8)),
    'pickup':   ('pickup',   0.0, 0.35, 0.002, 0.05, ('peak', -8)),
    'ringback': ('ringback', 0.0, 1.2, 0.01, 0.05, ('peak', -14)),
    # season 1, episode 1 "Meet the Family"
    'burp':      ('burp',      0.0, 1.3, 0.005, 0.15, ('peak', -4)),
    'creak':     ('creak',     0.0, 1.0, 0.005, 0.2, ('peak', -6)),
    'crunch':    ('crunch',    0.0, 0.4, 0.002, 0.08, ('peak', -6)),
    'kick':      ('kick',      0.0, 0.35, 0.002, 0.1, ('peak', -4)),
    'kibble':    ('kibble',    0.0, 0.6, 0.003, 0.1, ('peak', -10)),
    'slide':     ('slide',     0.0, 0.8, 0.01, 0.1, ('peak', -10)),
    'saxsqueak': ('saxsqueak', 0.0, 0.9, 0.005, 0.1, ('peak', -6)),
    'sax':       ('sax',       0.0, 12.0, 0.05, 0.8, ('rms', -22)),
    'birds':     ('birds',     0.0, 4.2, 0.2, 0.12, ('rms', -28)),   # ends hard: the birds cut out when Sarah's smile drops
    'sprinkler': ('sprinkler', 0.0, 4.0, 0.2, 0.3, ('rms', -32)),
    'truck':     ('truck',     0.0, 3.4, 0.05, 0.5, ('rms', -24)),
    'tv':        ('tv',        0.0, 8.0, 0.3, 0.5, ('rms', -34)),
    # S1E01 Triple-A
    'spray':     ('spraycan',  0.05, 1.95, 0.01, 0.15, ('peak', -8)),
    'stamp':     ('stamp',     0.14, 0.6, 0.002, 0.15, ('peak', -3)),
    'gavel':     ('gavel',     0.0, 0.9, 0.002, 0.25, ('peak', -3)),
    'scribble':  ('scribble',  0.0, 1.45, 0.01, 0.15, ('peak', -10)),
    'paperpile': ('paperpile', 0.25, 2.2, 0.005, 0.35, ('peak', -5)),
    'peel':      ('peel',      0.33, 0.95, 0.005, 0.08, ('peak', -8)),
    'typewriter': ('typewriter', 0.0, 1.2, 0.002, 0.2, ('peak', -9)),
    # "Nobody Picks Up"
    'ice':       ('nb-ice',    0.0, 1.8, 0.003, 0.2, ('peak', -3)),
    'tap':       ('click',     0.02, 0.1, 0.002, 0.03, ('peak', -3)),
    'plop':      ('nb-plop',   0.0, 0.7, 0.002, 0.1, ('peak', -5)),
    'drip':      ('drip',      0.0, 0.6, 0.003, 0.1, ('peak', -5)),
    'drive':     ('nb-drive',  0.0, 3.0, 0.02, 0.4, ('peak', -4)),
    'filmbed':   ('nb-film',   0.0, 10.0, 0.2, 0.2, ('rms', -28)),
    # "Nobody Picks Up" v3 (South Park look): two acoustic guitar stings (ElevenLabs music, made here): the opening strum and the end-card button
    'sting-a':   ('nv3-sting-a', 0.0, 3.0, 0.002, 0.6, ('peak', -6)),
    'sting-b':   ('nv3-sting-b', 0.0, 2.0, 0.002, 0.7, ('peak', -6)),
    # "Tip?": new clips from ElevenLabs sound generation (scripts/sfx-gen.mjs), trimmed to the sound itself
    'boing':     ('tip-boing',   0.0, 0.45, 0.001, 0.12, ('peak', -8)),
    'buzzer':    ('tip-buzzer',  0.0, 0.65, 0.004, 0.08, ('peak', -6)),
    'gasp':      ('tip-gasp',    0.0, 0.85, 0.01, 0.25, ('peak', -6)),
    'exhale':    ('tip-exhale',  0.0, 1.2, 0.02, 0.4, ('peak', -10)),
    'beep':      ('tip-beep',    0.0, 0.16, 0.001, 0.05, ('peak', -8)),
    'slap':      ('tip-slap',    0.07, 0.36, 0.002, 0.1, ('peak', -3)),
    'shuffle':   ('tip-shuffle', 0.0, 2.4, 0.05, 0.4, ('rms', -26)),
    'slurp':     ('tip-slurp',   0.0, 0.85, 0.003, 0.12, ('peak', -4)),
    'reader':    ('tip-reader',  0.0, 0.3, 0.002, 0.06, ('peak', -6)),
    'chime':     ('tip-chime',   0.0, 1.2, 0.002, 0.4, ('peak', -8)),     # v3: the coffee shop's door bell
    # "Because": new clips from ElevenLabs sound generation (scripts/sfx-gen.mjs), trimmed to the sound itself
    'kaching':   ('because-kaching', 0.0, 1.0, 0.001, 0.35, ('peak', -6)),   # the register, when the screen rolls to two million
    'slam':      ('because-slam',    0.0, 0.55, 0.001, 0.15, ('peak', -3)),  # the cup on the tray
    'kdoor':     ('because-kdoor',   0.28, 1.1, 0.003, 0.3, ('peak', -6)),   # the kitchen's swing door: a flap, a squeak, a thump
    'rustle':    ('because-rustle',  0.0, 0.7, 0.002, 0.2, ('peak', -9)),    # the paper hat changing heads
    # "Sell Me This Pen" (docs/x04-sell-me-this-pen.md): new clips from ElevenLabs sound generation and music
    'can':       ('pen-can',         0.1, 1.1, 0.002, 0.15, ('peak', -5)),   # a beer can cracked open
    'clatter':   ('pen-clatter',     0.0, 0.9, 0.002, 0.1, ('peak', -6)),    # the pen drops on the garage floor
    'puff':      ('pen-puff',        0.0, 0.7, 0.003, 0.1, ('peak', -9)),    # the 1949 clerk blows the dust off a bowl
    'penstory':  ('pen-story',       0.0, 18.0, 0.05, 1.2, ('rms', -24)),    # 1950s lounge jazz under the sepia story
    # "Cold Lips" (docs/x06-cold-lips.md): new clips from ElevenLabs sound generation (scripts/sfx-gen.mjs), trimmed to the sound itself
    'smooch':    ('lips-smooch',     0.50, 0.85, 0.004, 0.07, ('peak', -4)),  # a wet kiss: a short suction, then the pop at 0.24 s
    'doggasp':   ('lips-dog',        0.0, 0.22, 0.002, 0.08, ('peak', -6)),   # the chihuahua's one high yelp
    'hairdryer': ('lips-dryer',      0.0, 2.5, 0.12, 0.3, ('rms', -24)),      # steady whirr, the last close-up under the share line
    'cafebed':   ('lips-murmur',     0.0, 20.0, 0.3, 0.3, ('rms', -32)),      # low murmur and clinks of the shop, room tone until the freeze
    # "Cold Lips" v8 (2026-10-23, scripts/sfx-gen.mjs; nobody has listened: cut by their measured envelopes)
    'bigsplash': ('lips8-bigsplash', 0.0, 0.9, 0.002, 0.25, ('peak', -2)),   # the wall of coffee slams into Denise: the hit is the first frame
    'bellyflop': ('lips8-bellyflop', 0.0, 0.45, 0.002, 0.1, ('peak', -3)),   # Todd lands on his belly in the puddle
    'scrub':     ('lips8-scrub',     0.0, 0.88, 0.005, 0.08, ('peak', -8)),   # his tie on the drop on her shoe, squeaks
    'coins':     ('lips8-coins',     0.0, 0.7, 0.003, 0.1, ('peak', -6)),     # the tip jar shoved into her arms
    'rattle':    ('lips8-rattle',    0.0, 0.75, 0.003, 0.1, ('peak', -8)),    # the cup on Denise's head trembles
    'throb':     ('lips8-throb',     0.0, 0.4, 0.002, 0.1, ('peak', -4)),     # one heartbeat thump of the vein
    'snap':      ('lips8-snap',      0.1, 0.35, 0.003, 0.06, ('peak', -6)),   # her face snapping purple
    'friction':  ('lips8-friction',  0.0, 1.5, 0.03, 0.15, ('peak', -6)),     # Todd rubbing her foot like he is starting a fire
    # x08 "Just Let Me Pay" (2026-10-24, scripts/sfx-gen.mjs; nobody has listened to them yet)
    'kettle':    ('x08-kettle',      0.0, 3.0, 0.05, 0.2, ('peak', -6)),      # the steam whistling out of his ear holes, a hiss rising to a shriek (loudest at 1.36 s)
    'cork':      ('x08-cork',        0.0, 0.4, 0.002, 0.1, ('peak', -3)),     # one ear tunnel shooting out like a champagne cork
    'launch':    ('x08-launch',      0.0, 1.6, 0.005, 0.25, ('peak', -3)),    # the steam blasts him off the couch like a rocket
    'crash':     ('x08-crash',       0.0, 1.6, 0.002, 0.3, ('peak', -3)),     # through the ceiling and the roof, plaster raining down
    'whack':     ('x08-whack',       0.0, 0.45, 0.002, 0.08, ('peak', -3)),   # a pop-up window slapping onto his face
    'robot':     ('x08-robot',       0.0, 0.68, 0.003, 0.1, ('peak', -8)),    # "Too aggressive. Are you a robot?"
    # x09 "Habits of the Rich" (2026-10-24, scripts/sfx-gen.mjs; nobody has listened to them yet; trimmed by their measured envelopes)
    'pyro':      ('x09-pyro',        0.0, 1.0, 0.002, 0.25, ('peak', -2)),    # the stage's fire columns: one bang at 0.04 s, then a roaring decay
    'woo':       ('x09-woo',         0.0, 1.55, 0.03, 0.25, ('peak', -4)),    # the crowd's "WOOO!": soft onset, loudest at 0.26 s (starts on its frame)
    'alarm':     ('x09-alarm',       0.0, 0.85, 0.002, 0.1, ('peak', -8)),    # a twin-bell alarm clock ringing; the crash cuts it
    'marker':    ('x09-marker',      0.05, 1.4, 0.003, 0.05, ('peak', -8)),   # a felt-tip squealing on the whiteboard, irregular (starts on its frame)
    'clicks':    ('x09-clicks',      0.03, 0.88, 0.002, 0.06, ('peak', -9)),  # a crowd of ballpoint pens clicked, a ripple (the first click is at 0.02 s)
    'washer':    ('x09-washer',      0.0, 1.7, 0.02, 0.2, ('peak', -9)),      # the spin cycle, a drum tumbling
    'gulp':      ('x09-gulp',        0.0, 0.55, 0.002, 0.1, ('peak', -4)),    # one big nervous swallow (loudest at 0.30 s)
    # x10 "My Own Business" (2026-10-25, scripts/sfx-gen.mjs; nobody has listened to them yet; trimmed by their measured envelopes)
    'padlock':   ('x10-padlock',     0.0, 0.75, 0.002, 0.08, ('peak', -4)),   # the key's click at 0.03 s, the padlock dropping and landing at 0.30 s
    'shutter':   ('x10-shutter',     0.0, 1.05, 0.004, 0.2, ('peak', -3)),    # the roll-up shutter flying up and slamming at the top (the rattle starts on the first frame)
    'whump':     ('x10-whump',       0.0, 0.7, 0.002, 0.15, ('peak', -2)),    # a tower of cardboard boxes landing on a man (the thump at 0.07 s)
    'bell':      ('x10-bell',        0.0, 0.7, 0.002, 0.15, ('peak', -6)),    # a counter bell slapped: the ding is on the first frame
    'fire':      ('x10-fire',        0.0, 1.3, 0.002, 0.3, ('peak', -6)),     # a flare-up of a grill, a roar and a crackle fading
    'moth':      ('x10-moth',        0.0, 0.75, 0.003, 0.1, ('peak', -10)),   # a moth fluttering out of a drawer
    'clink':     ('x10-clink',       0.0, 0.45, 0.001, 0.1, ('peak', -6)),    # a coin on a metal edge
    'whistle':   ('x10-whistle',     0.0, 3.4, 0.01, 0.2, ('peak', -8)),      # the guy's happy tune, a whistled phrase
    'whistleback': ('x10-whistleback', 0.0, 1.5, 0.005, 0.12, ('peak', -8), 2.0),  # his answer: pitched up 2 semitones, from about 1.6 kHz onto the kettle's note (about 1.77 kHz)
    # x11 "Are You Open?" (2026-10-25, scripts/sfx-gen.mjs; nobody had listened to them: trimmed by their measured envelopes)
    'smack':     ('x11-smack',       0.12, 0.55, 0.002, 0.1, ('peak', -2)),   # a face slapped flat on glass: one thump, at 0.10 s after the trim (the 0.1 s before it are a faint wind-up)
    'squeak':    ('x11-squeak',      0.0, 1.45, 0.01, 0.15, ('peak', -8)),    # a wet palm sliding down glass, irregular (starts on its frame)
    'blind':     ('x11-blind',       0.0, 0.75, 0.002, 0.15, ('peak', -3)),   # a roller blind slammed down, then rattling: the slam is at 0.17 s
    'screech':   ('x11-screech',     0.0, 1.2, 0.002, 0.2, ('peak', -6)),     # tyres screeching away from a light: loud on the first frame, decays (starts on its frame)
    'curtain':   ('x11-curtain',     0.0, 0.5, 0.002, 0.1, ('peak', -4)),     # a shower curtain torn aside on its rings: the rip peaks at 0.16 s
    'boil':      ('x11-boil',        0.0, 2.4, 0.05, 0.2, ('peak', -9)),      # water at a rolling boil (a bed, no hit; starts on its frame)
    'clunk':     ('x11-clunk',       0.0, 0.45, 0.001, 0.1, ('peak', -4)),    # a bank of ceiling lights clunking on: the hit is the first frame
    'doorbell':  ('x11-doorbell',    0.0, 0.9, 0.002, 0.2, ('peak', -6)),     # a shop door's bell jingling: the first strike at 0.15 s
    'drum':      ('x11-drum',        0.05, 0.70, 0.003, 0.08, ('peak', -10)), # fingertips drumming on a steering wheel (the loud last knock of the raw clip, at 0.75 s, is cut off)
    # x12 "Speak to the Manager" (2026-10-25, scripts/sfx-gen.mjs; nobody had listened to them: trimmed by their measured envelopes)
    'thunder':   ('x12-thunder',     0.0, 1.5, 0.002, 0.45, ('peak', -3)),   # a thunderclap that rolls off: loud from the first frame, -26 dB by 1.3 s (starts on its frame)
    'crack':     ('x12-crack',       0.0, 1.2, 0.002, 0.3, ('peak', -3)),    # a ceiling splitting: small cracks at 0.05 and 0.17 s, the big one at 0.23 s, one at 0.29 s, a last split at 0.46-0.55 s, then the plaster (starts on its frame)
    'choir':     ('x12-choir',       0.0, 1.55, 0.12, 0.3, ('peak', -8)),    # a choir's "AAAH" chord held for 1.5 s (starts on its frame; the raw clip's first frame is already loud, so a 0.12 s swell is put in)
    'fanfare':   ('x12-fanfare',     0.0, 0.85, 0.002, 0.2, ('peak', -6)),   # a brass stab and its ring for the crown: loud from the first frame (starts on its frame)
    # x13 "Cheaper" (2026-10-26, scripts/sfx-gen.mjs; nobody had listened to them: trimmed by their measured envelopes)
    'spit':      ('x13-spit',        0.0, 0.5, 0.003, 0.15, ('peak', -3)),    # a spit-take's PFFFT: a loud hiss of spray from the first frame (the raw clip holds the same level to 0.88 s and ends in a hard cut: 0.5 s of it, faded) (starts on its frame)
    'splat':     ('x13-splat',       0.0, 0.4, 0.002, 0.1, ('peak', -2)),     # a wet slap on a face: the hit is the first frame, 22 dB down by 0.05 s (starts on its frame)
    'drawer':    ('x13-drawer',      0.0, 0.45, 0.002, 0.12, ('peak', -4)),   # a cash drawer yanked out of its till and rattling: loudest at 0.06 s, a second knock at 0.28 s (the raw clip's crash at 0.6 s is not used)
    # x14 "Four Stars" (2026-10-26, scripts/sfx-gen.mjs; nobody had listened to them: trimmed by their measured envelopes)
    'popper':    ('x14-popper',      0.42, 1.25, 0.01, 0.25, ('peak', -6)),   # a party popper's confetti: the raw clip is a faint low tail to 0.27 s, a gap, then a bright noise that swells from 0.42 s to full by 0.60 s and holds to 1.30 s; the swell to 1.25 s (starts on its frame, the loud part 0.15 s later)
    'taps':      ('x14-taps',        0.05, 1.12, 0.001, 0.1, ('peak', -6)),   # a thumb typing on a phone screen: six taps, the first loud one on the first frame (0.05 s of the raw clip), then 0.20, 0.57, 0.72, 0.83, 1.02 s after it (starts on its frame)
    # x15 "Bleep Fee" (2026-10-26, scripts/sfx-gen.mjs; nobody had listened to them: trimmed by their measured envelopes; the tone is a 1 kHz sine made with ffmpeg, at the level of the bleeps in the voice files, -21 dBFS rms)
    'phonebuzz': ('x15-buzz',        0.0, 0.70, 0.003, 0.06, ('rms', -20)),   # a phone buzzing on a wooden counter: the raw clip is a steady, clipped buzz at full level for 0.72 s (starts on its frame)
    'mailslot':  ('x15-mailslot',    0.80, 1.25, 0.003, 0.15, ('peak', -4)),  # envelopes shooting through a mail slot: the raw clip is a quiet flutter for 0.8 s, then the burst (loudest at 0.98 s) and its decay; the burst and the decay (starts on its frame)
    'lick':      ('x15-lick',        0.0, 0.78, 0.003, 0.08, ('peak', -3)),   # a plate licked clean: three slow licks (0.05, 0.25-0.35, 0.45-0.65 s) (starts on its frame)
    'pluck':     ('x15-pluck',       0.0, 0.47, 0.002, 0.08, ('peak', -4)),   # one hair pulled out: a tiny ping, the loudest 3 ms at 0.06 s, ringing at an even level to 0.45 s
    'printer':   ('x15-printer',     0.08, 1.05, 0.005, 0.12, ('rms', -20)),  # a receipt printer: a steady zzzt with bursts at 0.10-0.20 and 0.8-0.9 s, quiet next to its own peak, so it is levelled by rms (starts on its frame)
    'tone':      ('x15-tone',        0.0, 1.1, 0.01, 0.005, ('rms', -21)),    # the 1 kHz bleep tone of the steam word, as loud as the tones in the line files
    # x16 "Hiring a Zoomer" (2026-10-27, scripts/sfx-gen.mjs; nobody had listened to them: trimmed by their measured envelopes)
    'ringlight': ('x16-ringlight',   0.0, 0.80, 0.001, 0.25, ('peak', -3)),   # a ring light switched on: the clunk is the first 40 ms (0 dB), then a hum that falls from -11 to -22 dB re the clunk by 0.2 s and -35 by 0.6 s (starts on its frame)
    'stab':      ('x16-stab',        0.0, 0.22, 0.001, 0.06, ('peak', -4)),   # a flag stabbed into a cup: a thwip-tock, all in the first 40 ms (peak at 0.012 s), -40 dB by 0.1 s; sits under the ding
    'unsheathe': ('x16-unsheathe',   0.0, 0.52, 0.004, 0.06, ('peak', -4)),   # a sword drawn: a scrape that swells from -13 dB to full by 0.2 s, holds to 0.45 s and ends there (the tail after 0.5 s is -30 dB and lower, left out) (starts on its frame)
    'thunk':     ('x16-thunk',       0.0, 0.45, 0.001, 0.12, ('peak', -2)),   # the pole slammed down on a head: a deep thunk in the first 40 ms (0 dB), a wobble -7 dB at 0.05-0.08 s, then -17 and lower
    'flagstorm': ('x16-flagstorm',   0.0, 0.80, 0.02, 0.22, ('peak', -6)),    # a gust with many little flags flapping: loud and irregular to 0.75 s, then -20 dB and lower (starts on its frame; the picture's silence is 0.6 s after it)
    'line':      ('x16-line',        0.0, 3.0, 0.15, 0.3, ('rms', -30)),      # an impatient line: a steady grumble 17 dB under the clip's peak, with one foot stamp at 2.23-2.30 s (peak 2.244 s); the cues play parts of it (`from`, `len`)
    # x17 "Seat Swap" (2026-10-27, scripts/sfx-gen.mjs; nobody had listened to them: trimmed by their measured envelopes, 5 ms hop). `chime` is taken (Tip's door bell), so the cabin's is `bingbong`
    'bingbong':  ('x17-chime',       0.0, 1.0, 0.002, 0.45, ('peak', -8)),    # the cabin's chime: one 525 Hz tone (not two), loud on the first frame, -4.6 dB at 0.2 s, -10 at 0.4, -17 at 0.6, -26 at 1.0 (starts on its frame; the fade takes it out by 1.0 s so it is gone under the second word)
    'seatbelt':  ('x17-seatbelt',    0.17, 0.36, 0.002, 0.05, ('peak', -4)),  # a buckle: a small click at 0.19 s (-14 dB re the peak) and the clack at 0.25 s (peak), -29 dB by 0.30 s, the rest under -40 (0.17 s trimmed: the 0.15 s before it are the room at -45 dB)
    'squawk':    ('x17-squawk',      0.0, 0.62, 0.002, 0.10, ('peak', -3)),   # the peacock's scream: loud from the first frame (peak 0.035 s), flat within 2 dB to 0.55 s, then gone (-17 dB at 0.60 s) (starts on its frame)
    'tailfan':   ('x17-tailfan',     0.0, 0.70, 0.003, 0.20, ('peak', -9)),   # a tail of feathers fanned out: -2.5 dB on the first frame, the peak at 0.11 s, -11 dB at 0.30 s, -29 at 0.50 (the raw clip is quiet, -14 dBFS: levelled up)
    'hatch':     ('x17-hatch',       0.05, 0.72, 0.002, 0.10, ('peak', -3)),  # an exit's latch and the air: a clunk at 0.05-0.09 s (-8 dB re the peak; the raw 0.10-0.14 s), the rush of air swelling at 0.30-0.45 s (peak at 0.41 s, the raw 0.455 s), -26 dB by 0.55 s
    'suck':      ('x17-suck',        0.0, 0.68, 0.003, 0.06, ('peak', -3)),   # a vacuum whoosh: -12 dB on the first frame, swelling to the peak at 0.30 s, -15 dB at 0.50 s, cut off at 0.68 s in the raw clip (starts on its frame)
    'windbed':   ('x17-wind',        0.0, 3.0, 0.12, 0.05, ('rms', -27), 0, ('loop', 1.0, 11.5, 0.5)),   # the wind at altitude: a swell from -35 dB to full by 1.0 s (the howl-in), then its steady part (1.0-3.0 s, levelled flat by its own 0.3 s envelope) repeated with 0.5 s crossfades to 11.5 s; the cue ends it on the cockpit cut (starts on its frame)
    # x18 "Unattended" (2026-10-27, scripts/sfx-gen.mjs; nobody had listened to them: trimmed by their measured envelopes, 5 ms hop)
    'clockspin': ('x18-clock',       0.0, 0.45, 0.002, 0.05, ('peak', -6)),   # a clock's hands spinning an hour: five rising whirr sweeps 0.25 s apart (strikes at 0.10, 0.35, 0.60, 0.85, 1.10 s, -20 dB between); the picture's spin is 0.43 s, so the first two sweeps (0-0.15 and 0.2-0.4 s, silent at 0.40 s: -29 dB) (starts on its frame)
    'wagon':     ('x18-wagon',       0.0, 1.28, 0.005, 0.15, ('peak', -6)),   # a wagon rolling in on a wooden floor: a loud rumble from the first frame (-1 dB at 0.05 s, -6 to -9 dB to 0.95 s), rolling to a stop (-21 dB at 1.05 s, -32 at 1.10, -44 at 1.30) (starts on its frame)
    'giggle':    ('x18-giggle',      0.0, 0.80, 0.003, 0.15, ('peak', -4)),   # a toddler's giggle: -33 dB on the first 15 ms, then the loud first burst at 0.05-0.15 s (peak 0.055 s), bursts at 0.25-0.32 (-5 dB) and 0.47 (-11), a few at -20 dB to 0.80 s, gone (-47 dB) by 0.90 s (starts on its frame)
    'frenzy':    ('x18-frenzy',      0.0, 1.75, 0.003, 0.15, ('peak', -6)),   # frantic scrubbing and clattering: hits about 0.1 s apart for 1.6 s (the biggest at 0.43, 0.73, 0.85, 0.94, 1.05, 1.25, 1.45 s), -33 dB at 1.75 s and gone by 1.85 (starts on its frame)
    'cups':      ('x18-cups',        0.0, 0.33, 0.002, 0.06, ('peak', -4)),   # tiny cups sliding and clinking: a hit at 0.08 s (-3 dB) and 0.20 (-11), -27 dB at 0.30 s; the raw clip is silent from 0.35 to 0.70 s and has one big clank at 0.76 s (not used: the cues add the other clinks) (starts on its frame)
    # x19 "Screen Time" (2026-10-29, scripts/sfx-gen.mjs, raw clips in scratch/sfx-raw; nobody had listened to them: trimmed by their measured envelopes, 10 ms hop, dB re the clip's own peak). x19-hop is NOT used: 83 % of its energy is under 60 Hz (the
    # dominant tone is 25 Hz) and the two hits at 0.21 and 0.41 s are sub-bass thumps, not a muffin: the three hops use x16's `boing` (tip-boing) instead. x19-blast (88 % under 120 Hz, dominant 36 Hz) and x19-thoom (99 % under 120 Hz, dominant 43 Hz) are sub-bass booms that a phone speaker
    # (nothing under about 150 Hz) will hardly play: they stay, the thoom with x10's `whump` (58 % at 120-250 Hz) laid on its hit, the blast backed by the song's own full-level start
    'song':      ('x19-song',        0.0, 32.0, 0.0, 0.05, ('peak', -2)),     # the tablet's kids' song (music, instrumental, 120 bpm: a beat every 0.5 s, a bar every 2.0 s, nothing under 250 Hz): full level from the first sample (rms -13.5 dBFS raw, peaks over 0 dBFS, 31 % at 250-500 Hz, 44 % at 2-4 kHz), no silence at either end; the cues play it from its start (starts on its frame) and shape its level (src/x19-sched.ts SONG_ENV)
    'blast':     ('x19-blast',       0.0, 1.0, 0.002, 0.3, ('peak', -3)),     # the speaker's blast: a sub-bass boom at full level from the first sample (-3 dB at 0.10 s, -6 at 0.20, -15 at 0.50, -30 at 0.80, -40 at 0.90 s) (starts on its frame)
    'smash':     ('x19-smash',       0.0, 0.42, 0.001, 0.1, ('peak', -3)),    # a cup smashing: the hit is the first sample (-15 dB at 0.05 s), a second one at 0.17-0.19 s (-12 dB) and the shards at 0.22 (-18), -46 dB at 0.40 s (the raw tail to 1.48 s is under -60 dB) (starts on its frame)
    'whimper1':  ('x19-whimper1',    0.0, 0.90, 0.01, 0.2, ('peak', -5)),     # the toddler's first whimper: a whine from -11 dB at 0.0 to the peak by 0.10 s, held to 0.45 s, -17 dB at 0.7, a last hump at 0.84 s; the raw clip is cut off at 1.12 s (-30 dB) (0.90 s kept: it ends on the cut to the mom's head) (starts on its frame)
    'zip':       ('x19-zip',         0.0, 0.66, 0.003, 0.15, ('peak', -4)),   # the bars shooting off the screen: a zip at full level from the first sample (-2 dB) to 0.35 s, -15 dB at 0.50, -30 at 0.65 s, gone at 0.75 s (starts on its frame)
    'canopy':    ('x19-canopy',      0.37, 0.63, 0.001, 0.04, ('peak', -5)),  # a stroller canopy flipping up: a ratchet of clacks (the raw clip is quiet, rms -43 dBFS: levelled up); 0.37-0.63 s keeps the loud clack at 0.40 s (-2 dB), 0.49 (-5) and 0.60-0.63 (-5); the clack at 0.70 s (0 dB) is the THOOM's: not used
    'thoom':     ('x19-thoom',       0.0, 1.2, 0.002, 0.35, ('peak', -3)),    # the TV's THOOM: a sub-bass boom (the raw clip is very quiet, peak -34 dBFS: levelled up 31 dB) loud at the first sample, -10 dB at 0.20 s, -15 at 0.50, -23 at 1.0, -34 at 1.2 s (starts on its frame)
    'windows':   ('x19-windows',     0.0, 1.1, 0.005, 0.3, ('peak', -4)),     # the windows bulging with the sound: a low rumble at 60-250 Hz (the raw clip is quiet, peak -16 dBFS), -5 dB to 0.2 s, -10 at 0.3, -20 at 0.5, -27 at 0.8, -33 at 1.1 s (starts on its frame)
    'switch':    ('x19-switch',      0.44, 0.66, 0.002, 0.06, ('peak', -3)),  # a light switch: a click at 0.47-0.50 s (the peak at 0.50 s, 0.06 s after the trim), -22 dB at 0.55, -33 at 0.58 s; the rest of the raw clip is under -38 dB (the raw clip is quiet, peak -4 dBFS but rms -35)
    'popcorn':   ('x19-popcorn',     0.0, 0.75, 0.002, 0.15, ('peak', -6)),   # a popcorn bucket: pops at 0.03 s (0 dB), 0.13 (-5), 0.21 (-3), 0.39 (-6), -20 dB at 0.55 s, -37 at 0.75 s (starts on its frame)
    'cash':      ('x19-cash',        0.0, 0.85, 0.003, 0.2, ('peak', -6)),    # paper money flapping: rustles at 0.14 (-1 dB), 0.30 (-2), 0.48 (-4), 0.67 s (0, the raw peak), -30 dB at 0.85 s (the raw peak is the last rustle: the cue starts it on its frame, it is not placed by its peak) (starts on its frame)
    'munch':     ('x19-munch',       0.11, 0.78, 0.002, 0.15, ('peak', -6)),  # chewing popcorn: crunches at 0.12 s (-10 dB), 0.18-0.23 (0 dB, the peak), 0.31, 0.44, 0.56-0.65, -26 dB at 0.75 s; the 0.11 s before it are the room at -35 dB (starts on its frame)
    'blip':      ('x19-blip',        0.20, 0.42, 0.001, 0.06, ('peak', -4)),  # the battery's BLIP: a short bright beep, -18 dB at 0.21 s, the peak at 0.23-0.24 s, -24 dB at 0.30, -40 at 0.40; the raw clip's floor is -45 dB re the peak before and after
    'whimper2':  ('x19-whimper2',    0.35, 1.62, 0.003, 0.2, ('peak', -5)),   # the toddler's second whimper, building: -25 dB at 0.35 s, -16 at 0.50, -9 at 0.55-0.70 s (the raw clip is -36 dB at 0.0 and swells), the peak at 0.80 s, a dip at 1.0-1.05 s (-41 dB), a second swell to -8 at 1.15, a plateau at -15 dB to 1.5 s, gone by 1.7 s (starts on its frame, the build 0.45 s sooner than the raw clip's)
    'plug':      ('x19-plug',        0.04, 0.30, 0.002, 0.06, ('peak', -3)),  # a charger plugged in: a click at 0.08-0.10 s (the peak at 0.09 s, 0.05 s after the trim), -13 dB at 0.11 s, under -33 dB after; the clip is then silent (-75 dB) from 0.5 to 0.87 s, which is why `power` is cut from the same raw clip
    'power':     ('x19-plug',        0.87, 1.30, 0.005, 0.15, ('peak', -6)),  # the screen powering up: a rising tone-and-chime from 0.89 s (-25 dB at 0.90, -14 at 1.0, the peak -10 dB at 1.0-1.1 s), -17 dB at 1.2 s, -45 at 1.3 s (starts on its frame)
    # x20 "One Coffee" (2026-10-30, scripts/sfx-gen.mjs, raw clips in scratch/sfx-raw; nobody had listened to them: trimmed by their measured envelopes, 10 ms hop, dB re the clip's own peak; the mp3s' sample peaks run over 0 dBFS, the levelling is by the decoded peak)
    'radio':     ('x20-music',       0.0, 32.0, 0.0, 0.05, ('rms', -22), 0, None, 'highpass=f=150,highpass=f=150,acompressor=threshold=0.03:ratio=4:attack=10:release=250'),   # the café's radio (mellow acoustic jazz, 60 bpm, a beat at 0.07 + n s, a chord already at 0.07 s: loud from the first sample): 97 % of its energy is under 500 Hz and 39 % at 60-120 Hz, which a phone's speaker does not play, so it goes through a 150 Hz high-pass (two passes) and, because its 0.4 s loudness wanders 4.8 dB (std; the strong chords 21-22 s in are 10 dB over the soft bars), a compressor (3 dB: 1.6 dB std): a small radio with an AGC on a shelf. rms -22 dBFS, the cue sets the room level
    'tumbleweed': ('x20-tumbleweed', 0.45, 1.60, 0.03, 0.25, ('peak', -9)),            # a dry tumbleweed rolling over a wooden floor: 68 % at 120-250 Hz, 20 % at 60-120 Hz (dominant 154 Hz), a rustle that builds from -31 dB at 0 to its plateau (-8 .. 0 dB) at 0.45-1.60 s and falls to -17 dB at 1.65 s (the raw peak is -10.5 dBFS, rms -28.5: levelled up); the plateau is kept, the cue plays it for the 0.85 s of the wide shot
    'cricket':   ('x20-cricket',     0.04, 0.24, 0.002, 0.03, ('peak', -8)),             # a cricket: one pure 4.9 kHz chirp (100 % at 4-8 kHz): a group of three pulses at 0.05-0.20 s (-6, -4, -1 dB, silent -40 dB after 0.20 s), then 0.3 s of nothing and a long trill from 0.55 to 1.8 s; the group is kept (starts on its frame, its loudest pulse 0.12 s in)
    'scrape':    ('x20-scrape',      0.0, 0.62, 0.003, 0.10, ('peak', -6)),              # wooden tables dragged over a floor: scraping 120-2000 Hz (244 Hz dominant, 23 % at 120-250, 62 % at 250-1000 Hz, so a phone plays it), irregular, within -9 .. 0 dB from 0.0 to 1.40 s, then -26 dB at 1.50 s; the first 0.62 s are kept so that it is over before the plug is pulled (starts on its frame)
    'sputter':   ('x20-sputter',     0.80, 1.70, 0.003, 0.15, ('peak', -6)),             # an espresso machine sputtering out: a hiss, 99 % over 4 kHz (dominant 10 kHz), flat within 3 dB from 0.04 to 0.95 s, then it dies: -4 dB at 1.10 s, -8 at 1.25, -12 at 1.35, -19 at 1.50, -24 at 1.60, -34 at 1.65; 0.80-1.70 s are kept (0.2 s of steady hiss, then the death) so that its end falls inside the shot (starts on its frame)
    'gong':      ('x20-gong',        0.0, 3.0, 0.0, 0.5, ('peak', -3)),                  # a big brass gong: struck at 0.0 s (-4 dB), at full level from 0.10 to 0.55 s (the 3 ms peak is 0.26 s in, but the strike is the first sample), -3 dB at 0.8, -10 at 2.0, -20 at 2.5, -33 at 3.0 s, gone by 3.9 s; 120-1000 Hz in equal thirds (200 Hz dominant), 11 % at 1-2 kHz; 3.0 s kept (starts on its frame)
    'cheer':     ('x20-cheer',       0.0, 1.62, 0.002, 0.10, ('peak', -4)),              # four men cheering: 86 % at 500-1000 Hz (710 Hz dominant), -19 dB at 0.0 and -2 at 0.05 s, steady within 5 dB to 1.45 s, -8 dB at 1.50-1.55 and -17 at 1.60 s, a hard cut to -37 dB at 1.65 s: 1.62 s kept (starts on its frame)
    'champagne': ('x20-champagne',   0.0, 0.42, 0.002, 0.05, ('peak', -6)),              # a champagne bottle's burst of foam: 83 % over 4 kHz (dominant 10 kHz), nothing under 1 kHz, a hiss at full level from the first sample to 0.35 s (-2 dB), -15 dB at 0.40 s, -38 at 0.45 s, then under -45 dB to the end (blips at -32 dB at 0.75-0.90 s are not used): 0.42 s kept (starts on its frame); `pop` is laid on it for the body it lacks
}


for name, spec in PLAN.items():
    s, a, b, fi, fo, (mode, level) = spec[:6]
    semis = spec[6] if len(spec) > 6 else 0  # an optional seventh item: pitch it up by this many semitones (resampled: it gets shorter)
    if sys.argv[1:] and name not in sys.argv[1:]: continue  # python scripts/sfx-build.py sting-a sting-b builds just those
    loop = spec[7] if len(spec) > 7 else None  # an optional eighth item ('loop', head s, total s, crossfade s): keep the first `head` s, then repeat the rest (flattened by its own envelope) with crossfades up to `total` s
    x = decode(os.path.join(src, s + '.mp3'))
    x = x[int(a * SR): int(b * SR)].copy()
    if loop:  # ponytail: a power crossfade is right for noise (the wind has no steady tone to cancel); a tonal clip would need its period matched
        _, head, total, xf = loop
        h, c, w = int(head * SR), int(xf * SR), int(0.3 * SR) | 1
        body = x[h:].astype(np.float64)
        env = np.sqrt(np.convolve(np.pad(body ** 2, w // 2, mode='reflect'), np.ones(w) / w, mode='valid')) + 1e-6
        body = (body / env * env.mean()).astype(np.float32)
        out, ramp = x[:h].copy(), np.linspace(0, np.pi / 2, c)
        while len(out) < int(total * SR):
            out = np.concatenate([out[:-c], out[-c:] * np.cos(ramp) + body[:c] * np.sin(ramp), body[c:]])
        x = out[:int(total * SR)]
    if semis:
        k = 2 ** (semis / 12)
        x = np.interp(np.arange(0, len(x) - 1, k), np.arange(len(x)), x)
    af = spec[8] if len(spec) > 8 else None  # an optional ninth item: an ffmpeg audio filter chain applied before the levelling (x20's radio: a high-pass for what a small speaker does not play, a compressor for its even level)
    if af:
        p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', af, '-f', 'f32le', '-'], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), capture_output=True, check=True)
        x = np.frombuffer(p.stdout, dtype=np.float32).copy()
    if mode == 'rms':
        x = x * (10 ** (level / 20) / max(1e-6, np.sqrt(np.mean(x ** 2))))
        x = np.tanh(x * 1.2) / 1.2  # a few loud drops: soft clip rather than hard
    else:
        x = x * (10 ** (level / 20) / max(1e-6, np.abs(x).max()))
    f, g = int(fi * SR), int(fo * SR)
    x[:f] *= np.linspace(0, 1, f)
    x[-g:] *= np.linspace(1, 0, g)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-codec:a', 'libmp3lame', '-b:a', '128k', '-map_metadata', '-1', os.path.join(dst, name + '.mp3')], input=x.astype(np.float32).tobytes(), check=True)
    print(f'{name:9s} {len(x) / SR:4.2f} s  peak {20 * np.log10(np.abs(x).max()):5.1f} dB')
