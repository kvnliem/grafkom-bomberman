# Proyek UTS Grafkom - Super Bomberman R

- Fabio: Magnet Bomber (`fabio/`)
- Kevin: White Bomber (`kevin/`)
- Nick: Golem Bomber (`nick/`)

## Cara run

Pakai Live Server di VS Code. Kalau dibuka langsung (double click) ga bakal jalan karena pakai import/export.

- `index.html` = scene gabungan 3 karakter
- `fabio/preview.html`, `kevin/preview.html`, `nick/preview.html` = karakter masing-masing aja

Drag mouse buat muter kamera, scroll buat zoom.

## Aturan

- Edit folder sendiri aja. Jangan edit `shared/` sendirian, omongin dulu di grup.
- Jangan bikin canvas, shader, atau requestAnimationFrame sendiri, udah ada di `shared/engine.js`.
- File karakter export 2 function: `buatXxx(GL)` sama `animasiXxx(time)`.
- Kaki di y = 0, tinggi kira-kira 2 unit, menghadap kamera (+Z).
- Rumus quadric / kurva bikin sendiri di folder masing-masing.
- Isi folder sekarang cuma contoh, ganti aja sama karakter kalian.

## Git

Kerja di branch sendiri (`fabio`, `kevin`, `nick`), terus bikin Pull Request ke `main`.

```
git checkout -b nama-kalian
git add .
git commit -m "..."
git push -u origin nama-kalian
```
