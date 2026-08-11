# Third-party VFX code

The contents of `lib/vfx/` — except `lib/vfx/reveal/`, which is our own — are
ported from **Elemental Sandbox**:

- Source: https://github.com/achrefelouafi/LinearAbiltyCastingThreeJS
- Author: mohamedachrefelouafi
- License: MIT

Files were copied with their directory structure preserved so their relative
imports still resolve. Local modifications are marked with a `PORT:` comment.

Our own code lives in `lib/vfx/reveal/`, which composes the ported primitives
into a vertical card-reveal instead of the original's ground-targeted ability
casts. The original's `abilities/`, `input/`, `animation/`, `world/`, `ui/` and
`loaders/` layers were not ported.

## MIT License

```
MIT License

Copyright (c) 2026 mohamedachrefelouafi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
