import { Objek } from "../shared/objek.js";
import { LIBS } from "../shared/libs.js";

// contoh doang, nanti diganti sama karakter asli

var badan, pinggulKiri, pinggulKanan;

// ellipsoid, y ke atas
function buatEllipsoid(a, b, c, stack, sector) {
    var vertex = [];
    var faces = [];

    for (var i = 0; i <= stack; i++) {
        var v = -Math.PI / 2 + Math.PI * i / stack;
        for (var j = 0; j <= sector; j++) {
            var u = -Math.PI + 2 * Math.PI * j / sector;
            vertex.push(
                a * Math.cos(v) * Math.cos(u),
                b * Math.sin(v),
                c * Math.cos(v) * Math.sin(u)
            );
        }
    }

    for (var i = 0; i < stack; i++) {
        for (var j = 0; j < sector; j++) {
            var p1 = i * (sector + 1) + j;
            var p2 = p1 + sector + 1;
            faces.push(p1, p2, p1 + 1);
            faces.push(p1 + 1, p2, p2 + 1);
        }
    }

    return { vertex: vertex, faces: faces };
}

export function buatMagnetBomber(GL) {
    var warna = [0.2, 0.5, 1.0];

    // root di tanah (y = 0), kosong
    var root = new Objek(GL);

    var b = buatEllipsoid(0.5, 0.55, 0.5, 20, 20);
    badan = new Objek(GL, b.vertex, b.faces, warna);
    LIBS.set_position(badan.MOVEMATRIX, 0, 1.0, 0);
    root.addChild(badan);

    var k = buatEllipsoid(0.45, 0.4, 0.45, 20, 20);
    var kepala = new Objek(GL, k.vertex, k.faces, [1, 1, 1]);
    LIBS.set_position(kepala.MOVEMATRIX, 0, 0.8, 0);
    badan.addChild(kepala);

    // pinggul = pivot buat kaki, ga ada bentuknya
    pinggulKiri = new Objek(GL);
    pinggulKanan = new Objek(GL);
    LIBS.set_position(pinggulKiri.MOVEMATRIX, -0.2, -0.4, 0);
    LIBS.set_position(pinggulKanan.MOVEMATRIX, 0.2, -0.4, 0);
    badan.addChild(pinggulKiri);
    badan.addChild(pinggulKanan);

    var kk = buatEllipsoid(0.15, 0.3, 0.15, 12, 12);
    var kakiKiri = new Objek(GL, kk.vertex, kk.faces, warna);
    var kakiKanan = new Objek(GL, kk.vertex, kk.faces, warna);
    LIBS.set_position(kakiKiri.MOVEMATRIX, 0, -0.3, 0);
    LIBS.set_position(kakiKanan.MOVEMATRIX, 0, -0.3, 0);
    pinggulKiri.addChild(kakiKiri);
    pinggulKanan.addChild(kakiKanan);

    return root;
}

// animasi nanti
export function animasiMagnetBomber(time) {
}
