"""Original synthesized test accompaniment, no third-party music or vocals."""
import math
import struct
import wave
from pathlib import Path
RATE = 16000
DURATION = 120
Path('public/audio').mkdir(exist_ok=True)
for name, bpm, melody in [('cheer', 130, [60, 64, 67, 72, 67, 64, 62, 67]), ('idol', 140, [72, 76, 79, 76, 74, 77, 81, 79])]:
    with wave.open(f'public/audio/{name}-demo.wav', 'wb') as output:
        output.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        samples = bytearray()
        for i in range(RATE * DURATION):
            t = i / RATE
            beat = t * bpm / 60
            phase = beat % 1
            note = melody[int(beat) % len(melody)]
            freq = 440 * 2 ** ((note - 69) / 12)
            envelope = min(1, phase * 30) * math.exp(-phase * 4)
            lead = (math.sin(2 * math.pi * freq * t) + .25 * math.sin(4 * math.pi * freq * t)) * envelope * .16
            kick = math.sin(2 * math.pi * (55 * t + 2 * (1 - math.exp(-phase * 12)))) * math.exp(-phase * 16) * .20
            bass = math.sin(2 * math.pi * freq / 4 * t) * .09 * envelope
            fade = min(1, t / .5, (DURATION - t) / 2)
            samples.extend(struct.pack('<h', int((lead + kick + bass) * fade * 24000)))
        output.writeframes(samples)
