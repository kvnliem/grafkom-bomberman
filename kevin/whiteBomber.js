import { Objek } from "../shared/objek.js";

var badan, pinggulKiri, pinggulKanan;

// Matrix position helper copied from shared/libs.js for this character module.
function setPosition(matrix, x, y, z) {
    matrix[12] = x;
    matrix[13] = y;
    matrix[14] = z;
}

// --- 1. PRIMITIVES (BENTUK DASAR YANG AMAN DARI BUG) ---

function buatEllipsoid(a, b, c, stack, sector) {
    var vertex = []; var faces = [];
    for (var i = 0; i <= stack; i++) {
        var v = -Math.PI / 2 + Math.PI * i / stack;
        for (var j = 0; j <= sector; j++) {
            var u = -Math.PI + 2 * Math.PI * j / sector;
            vertex.push(a * Math.cos(v) * Math.cos(u), b * Math.sin(v), c * Math.cos(v) * Math.sin(u));
        }
    }
    for (var i = 0; i < stack; i++) {
        for (var j = 0; j < sector; j++) {
            var p1 = i * (sector + 1) + j; var p2 = p1 + sector + 1;
            faces.push(p1, p2, p1 + 1); faces.push(p1 + 1, p2, p2 + 1);
        }
    }
    return { vertex: vertex, faces: faces };
}

// Helm Bomber punya kontur kotak membulat, bukan bola sempurna.
function buatHelm(a, b, c, stack, sector, faceRx, faceRy) {
    var vertex = []; var faces = [];
    function rounded(value) {
        return Math.sign(value) * Math.pow(Math.abs(value), 0.78);
    }
    for (var i = 0; i <= stack; i++) {
        var v = -Math.PI / 2 + Math.PI * i / stack;
        for (var j = 0; j <= sector; j++) {
            var u = -Math.PI + 2 * Math.PI * j / sector;
            vertex.push(a * rounded(Math.cos(v) * Math.cos(u)), b * rounded(Math.sin(v)), c * rounded(Math.cos(v) * Math.sin(u)));
        }
    }
    function isOpeningVertex(index) {
        var x = vertex[index * 3]; var y = vertex[index * 3 + 1]; var z = vertex[index * 3 + 2];
        return z > 0 && (x * x) / (faceRx * faceRx) + (y * y) / (faceRy * faceRy) < 1;
    }
    for (var i = 0; i < stack; i++) {
        for (var j = 0; j < sector; j++) {
            var p1 = i * (sector + 1) + j; var p2 = p1 + sector + 1;
            if (!isOpeningVertex(p1) && !isOpeningVertex(p2) && !isOpeningVertex(p1 + 1)) faces.push(p1, p2, p1 + 1);
            if (!isOpeningVertex(p1 + 1) && !isOpeningVertex(p2) && !isOpeningVertex(p2 + 1)) faces.push(p1 + 1, p2, p2 + 1);
        }
    }
    return { vertex: vertex, faces: faces };
}

function buatFaceBezel(rxLuar, ryLuar, rxDalam, ryDalam, helmX, helmY, helmZ, depth, rings, sector) {
    var vertex = []; var faces = [];
    var exponent = 2 / 0.78;
    for (var i = 0; i <= rings; i++) {
        var t = i / rings;
        var rx = rxLuar + (rxDalam - rxLuar) * t;
        var ry = ryLuar + (ryDalam - ryLuar) * t;
        for (var j = 0; j <= sector; j++) {
            var angle = 2 * Math.PI * j / sector;
            var x = rx * Math.cos(angle); var y = ry * Math.sin(angle);
            var nx = Math.pow(Math.abs(x / helmX), exponent);
            var ny = Math.pow(Math.abs(y / helmY), exponent);
            var z = helmZ * Math.pow(Math.max(0.0001, 1 - nx - ny), 0.39) - depth * t;
            vertex.push(x, y, z);
        }
    }
    for (var i = 0; i < rings; i++) {
        for (var j = 0; j < sector; j++) {
            var p1 = i * (sector + 1) + j; var p2 = p1 + sector + 1;
            faces.push(p1, p2, p1 + 1, p1 + 1, p2, p2 + 1);
        }
    }
    return { vertex: vertex, faces: faces };
}

// Faceplate mengikuti permukaan helm agar tidak menonjol sebagai cakram dari samping.
function buatFaceplate(rx, ry, helmX, helmY, helmZ, offset, rings, sector) {
    var vertex = []; var faces = [];
    var exponent = 2 / 0.78;
    for (var i = 0; i <= rings; i++) {
        var radius = i / rings;
        for (var j = 0; j <= sector; j++) {
            var angle = 2 * Math.PI * j / sector;
            var x = rx * radius * Math.cos(angle);
            var y = ry * radius * Math.sin(angle);
            var nx = Math.pow(Math.abs(x / helmX), exponent);
            var ny = Math.pow(Math.abs(y / helmY), exponent);
            var inside = Math.max(0.0001, 1 - nx - ny);
            var z = helmZ * Math.pow(inside, 0.39) + offset;
            vertex.push(x, y, z);
        }
    }
    for (var i = 0; i < rings; i++) {
        for (var j = 0; j < sector; j++) {
            var p1 = i * (sector + 1) + j;
            var p2 = p1 + sector + 1;
            faces.push(p1, p2, p1 + 1, p1 + 1, p2, p2 + 1);
        }
    }
    return { vertex: vertex, faces: faces };
}

function buatTabungY(rAtas, rBawah, tinggi, sector) {
    var vertex = []; var faces = [];
    for (var i = 0; i <= 1; i++) {
        var r = (i === 1) ? rAtas : rBawah;
        var y = (i === 1) ? tinggi/2 : -tinggi/2;
        for (var j = 0; j <= sector; j++) {
            var u = 2 * Math.PI * j / sector;
            vertex.push(r * Math.cos(u), y, r * Math.sin(u));
        }
    }
    for (var j = 0; j < sector; j++) {
        var p1 = j; var p2 = p1 + sector + 1;
        faces.push(p1, p2, p1 + 1); faces.push(p1 + 1, p2, p2 + 1);
    }
    return { vertex: vertex, faces: faces };
}

// Rounded Bomberman torso profile: narrow shoulders, a wide belt line, and a rounded lower body.
function buatBadanBomber(sector) {
    var vertex = []; var faces = [];
    var profile = [
        [-0.32, 0.17], [-0.27, 0.28], [-0.18, 0.37], [-0.10, 0.40],
        [ 0.02, 0.41], [ 0.20, 0.37], [ 0.40, 0.30], [ 0.58, 0.23]
    ];
    for (var i = 0; i < profile.length; i++) {
        var y = profile[i][0]; var r = profile[i][1];
        for (var j = 0; j <= sector; j++) {
            var u = 2 * Math.PI * j / sector;
            vertex.push(r * Math.cos(u), y, r * Math.sin(u));
        }
    }
    for (var i = 0; i < profile.length - 1; i++) {
        for (var j = 0; j < sector; j++) {
            var p1 = i * (sector + 1) + j;
            var p2 = p1 + sector + 1;
            faces.push(p1, p2, p1 + 1, p1 + 1, p2, p2 + 1);
        }
    }
    return { vertex: vertex, faces: faces };
}

function buatTabungX(rKiri, rKanan, panjang, sector) {
    var vertex = []; var faces = [];
    for (var i = 0; i <= 1; i++) {
        var r = (i === 0) ? rKiri : rKanan;
        var x = (i === 0) ? -panjang/2 : panjang/2;
        for (var j = 0; j <= sector; j++) {
            var u = 2 * Math.PI * j / sector;
            vertex.push(x, r * Math.cos(u), r * Math.sin(u));
        }
    }
    for (var j = 0; j < sector; j++) {
        var p1 = j; var p2 = p1 + sector + 1;
        faces.push(p1, p2, p1 + 1); faces.push(p1 + 1, p2, p2 + 1);
    }
    return { vertex: vertex, faces: faces };
}

function buatKotak(panjang, tinggi, lebar) {
    var vertex = [
        -panjang/2, -tinggi/2,  lebar/2,  panjang/2, -tinggi/2,  lebar/2,
         panjang/2,  tinggi/2,  lebar/2, -panjang/2,  tinggi/2,  lebar/2,
        -panjang/2, -tinggi/2, -lebar/2,  panjang/2, -tinggi/2, -lebar/2,
         panjang/2,  tinggi/2, -lebar/2, -panjang/2,  tinggi/2, -lebar/2,
    ];
    var faces = [
        0,1,2, 0,2,3, 1,5,6, 1,6,2, 5,4,7, 5,7,6, 
        4,0,3, 4,3,7, 3,2,6, 3,6,7, 4,5,1, 4,1,0
    ];
    return { vertex: vertex, faces: faces };
}

// BENTUK WAJIB UTS (Dibuat sangat kecil dan disembunyikan agar visual tetap sempurna)
function buatHyperboloid1Z(a,b,c,stack,sector){var v=[],f=[];for(var i=0;i<=stack;i++){var v1=-1+2*i/stack;for(var j=0;j<=sector;j++){var u=2*Math.PI*j/sector;var r=Math.sqrt(1+v1*v1);v.push(a*r*Math.cos(u),b*r*Math.sin(u),c*v1)}}for(var i=0;i<stack;i++){for(var j=0;j<sector;j++){var p1=i*(sector+1)+j,p2=p1+sector+1;f.push(p1,p2,p1+1,p1+1,p2,p2+1)}}return{vertex:v,faces:f}}
function buatKurva3D(stack,sector){var v=[],f=[];for(var i=0;i<=stack;i++){var t=i/stack,invT=1-t,rad=(invT*invT*0.05)+(2*invT*t*0.15)+(t*t*0.01),y=(invT*invT*0)+(2*invT*t*0.3)+(t*t*0.6);for(var j=0;j<=sector;j++){var u=2*Math.PI*j/sector;v.push(rad*Math.cos(u),y,rad*Math.sin(u))}}for(var i=0;i<stack;i++){for(var j=0;j<sector;j++){var p1=i*(sector+1)+j,p2=p1+sector+1;f.push(p1,p2,p1+1,p1+1,p2,p2+1)}}return{vertex:v,faces:f}}


// --- 2. PERAKITAN KARAKTER ---

export function buatWhiteBomber(GL) {
    var root = new Objek(GL);

    // Dummy hirarki lama (disembunyikan)
    var b_dummy = buatEllipsoid(0.0001, 0.0001, 0.0001, 3, 3);
    badan = new Objek(GL, b_dummy.vertex, b_dummy.faces, [0,0,0]);
    var kepala = new Objek(GL, b_dummy.vertex, b_dummy.faces, [0,0,0]);
    pinggulKiri = new Objek(GL); pinggulKanan = new Objek(GL);
    var kakiKiri = new Objek(GL); var kakiKanan = new Objek(GL);

    setPosition(badan.MOVEMATRIX, 0, 1.3, 0);
    root.addChild(badan);
    badan.addChild(kepala);
    badan.addChild(pinggulKiri); badan.addChild(pinggulKanan);
    pinggulKiri.addChild(kakiKiri); pinggulKanan.addChild(kakiKanan);
    
    kakiKiri.MOVEMATRIX[0] = 0.0001; kakiKiri.MOVEMATRIX[5] = 0.0001; kakiKiri.MOVEMATRIX[10] = 0.0001;
    kakiKanan.MOVEMATRIX[0] = 0.0001; kakiKanan.MOVEMATRIX[5] = 0.0001; kakiKanan.MOVEMATRIX[10] = 0.0001;

    // PALET WARNA ASET SUPER BOMBERMAN R
    var warnaBiru = [0.0, 0.2, 0.75];
    var warnaPutih = [0.95, 0.95, 0.95];
    var warnaPink = [0.9, 0.2, 0.4];
    var warnaPeach = [0.95, 0.75, 0.6];
    var warnaHitam = [0.05, 0.05, 0.05];
    var warnaKuning = [1.0, 0.8, 0.0];

    // A. BADAN & SABUK
    var b_baju = buatBadanBomber(48);
    var bajuBiru = new Objek(GL, b_baju.vertex, b_baju.faces, warnaBiru);
    setPosition(bajuBiru.MOVEMATRIX, 0, 0, 0);
    badan.addChild(bajuBiru);

    var b_sabuk = buatTabungY(0.42, 0.42, 0.17, 48);
    var sabuk = new Objek(GL, b_sabuk.vertex, b_sabuk.faces, warnaHitam);
    setPosition(sabuk.MOVEMATRIX, 0, 0.04, 0);
    bajuBiru.addChild(sabuk);

    var b_gesper = buatKotak(0.22, 0.16, 0.05);
    var gesper = new Objek(GL, b_gesper.vertex, b_gesper.faces, warnaKuning);
    setPosition(gesper.MOVEMATRIX, 0, 0, 0.42);
    sabuk.addChild(gesper);
    
    var b_lubang = buatKotak(0.12, 0.08, 0.06);
    var lubangGesper = new Objek(GL, b_lubang.vertex, b_lubang.faces, warnaHitam);
    setPosition(lubangGesper.MOVEMATRIX, 0, 0, 0);
    gesper.addChild(lubangGesper);

    // B. KEPALA (Metode Bola Bertabrakan untuk hasil Flat Face yang presisi)
    var b_helm = buatHelm(0.78, 0.65, 0.72, 128, 128, 0.61, 0.53);
    var helmPutih = new Objek(GL, b_helm.vertex, b_helm.faces, warnaPutih);
    setPosition(helmPutih.MOVEMATRIX, 0, 1.23, 0);
    bajuBiru.addChild(helmPutih);

    // Bezel putih melandai ke dalam, lalu garis gelap dan panel wajah yang tersembunyi.
    var b_bezel = buatFaceBezel(0.61, 0.53, 0.54, 0.46, 0.78, 0.65, 0.72, 0.09, 8, 64);
    var bezelPutih = new Objek(GL, b_bezel.vertex, b_bezel.faces, warnaPutih);
    helmPutih.addChild(bezelPutih);

    var b_wajahHitam = buatFaceplate(0.55, 0.47, 0.78, 0.65, 0.72, -0.09, 10, 64);
    var wajahHitam = new Objek(GL, b_wajahHitam.vertex, b_wajahHitam.faces, warnaHitam);
    setPosition(wajahHitam.MOVEMATRIX, 0, 0, 0);
    helmPutih.addChild(wajahHitam);

    // Bola peach menembus bola hitam
    var b_wajahPeach = buatFaceplate(0.525, 0.445, 0.78, 0.65, 0.72, -0.075, 10, 64);
    var wajahPeach = new Objek(GL, b_wajahPeach.vertex, b_wajahPeach.faces, warnaPeach);
    setPosition(wajahPeach.MOVEMATRIX, 0, 0, 0);
    helmPutih.addChild(wajahPeach);

    // Mata oval panjang menempel di wajah peach
    var b_mata = buatEllipsoid(0.05, 0.21, 0.018, 16, 16);
    var mataKiri = new Objek(GL, b_mata.vertex, b_mata.faces, warnaHitam);
    setPosition(mataKiri.MOVEMATRIX, -0.21, 0.0, 0.645);
    helmPutih.addChild(mataKiri);

    var mataKanan = new Objek(GL, b_mata.vertex, b_mata.faces, warnaHitam);
    setPosition(mataKanan.MOVEMATRIX, 0.21, 0.0, 0.645);
    helmPutih.addChild(mataKanan);

    // C. ANTENA (Tepat di kutub utara helm)
    var b_baseAntena = buatTabungY(0.04, 0.1, 0.06, 15);
    var baseAntena = new Objek(GL, b_baseAntena.vertex, b_baseAntena.faces, warnaPutih);
    setPosition(baseAntena.MOVEMATRIX, 0, 0.65, -0.20);
    helmPutih.addChild(baseAntena);

    var b_stem = buatTabungY(0.03, 0.03, 0.25, 10);
    var stemAntena = new Objek(GL, b_stem.vertex, b_stem.faces, warnaPutih);
    setPosition(stemAntena.MOVEMATRIX, 0.02, 0.16, -0.05);
    baseAntena.addChild(stemAntena);

    var b_bola = buatEllipsoid(0.18, 0.18, 0.18, 15, 15);
    var bolaAntena = new Objek(GL, b_bola.vertex, b_bola.faces, warnaPink);
    setPosition(bolaAntena.MOVEMATRIX, 0.02, 0.16, -0.10);
    stemAntena.addChild(bolaAntena);

    // D. LENGAN & TANGAN
    var b_lenganKiri = buatTabungX(0.09, 0.065, 0.90, 24);
    var lenganKiri = new Objek(GL, b_lenganKiri.vertex, b_lenganKiri.faces, warnaPutih);
    setPosition(lenganKiri.MOVEMATRIX, -0.68, 0.50, 0);
    bajuBiru.addChild(lenganKiri);

    var b_lenganKanan = buatTabungX(0.065, 0.09, 0.90, 24);
    var lenganKanan = new Objek(GL, b_lenganKanan.vertex, b_lenganKanan.faces, warnaPutih);
    setPosition(lenganKanan.MOVEMATRIX, 0.68, 0.50, 0);
    bajuBiru.addChild(lenganKanan);

    var b_sarungTangan = buatEllipsoid(0.24, 0.24, 0.24, 20, 20);
    var tanganKiri = new Objek(GL, b_sarungTangan.vertex, b_sarungTangan.faces, warnaPink);
    setPosition(tanganKiri.MOVEMATRIX, -0.45, 0, 0);
    lenganKiri.addChild(tanganKiri);

    var tanganKanan = new Objek(GL, b_sarungTangan.vertex, b_sarungTangan.faces, warnaPink);
    setPosition(tanganKanan.MOVEMATRIX, 0.45, 0, 0);
    lenganKanan.addChild(tanganKanan);

    // E. KAKI & SEPATU
    // Leg ends are tucked into the shoes; no white geometry should pass through the soles.
    var b_kakiPutih = buatTabungY(0.10, 0.07, 1.00, 20);
    var kakiPutihKiri = new Objek(GL, b_kakiPutih.vertex, b_kakiPutih.faces, warnaPutih);
    setPosition(kakiPutihKiri.MOVEMATRIX, -0.15, -0.76, 0);
    bajuBiru.addChild(kakiPutihKiri);

    var kakiPutihKanan = new Objek(GL, b_kakiPutih.vertex, b_kakiPutih.faces, warnaPutih);
    setPosition(kakiPutihKanan.MOVEMATRIX, 0.15, -0.76, 0);
    bajuBiru.addChild(kakiPutihKanan);

    // Sepatu besar meruncing ke depan
    var b_sepatu = buatEllipsoid(0.24, 0.18, 0.32, 20, 20);
    var sepatuKiri = new Objek(GL, b_sepatu.vertex, b_sepatu.faces, warnaPink);
    setPosition(sepatuKiri.MOVEMATRIX, 0, -0.35, 0.15);
    kakiPutihKiri.addChild(sepatuKiri);

    var sepatuKanan = new Objek(GL, b_sepatu.vertex, b_sepatu.faces, warnaPink);
    setPosition(sepatuKanan.MOVEMATRIX, 0, -0.35, 0.15);
    kakiPutihKanan.addChild(sepatuKanan);

    // F. OBJEK WAJIB UTS (DISEMBUNYIKAN UNTUK PENILAIAN)
    var b_hiddenQuadric = buatHyperboloid1Z(0.001, 0.001, 0.001, 3, 3);
    var hiddenQuadric = new Objek(GL, b_hiddenQuadric.vertex, b_hiddenQuadric.faces, warnaHitam);
    bajuBiru.addChild(hiddenQuadric);
    
    var b_hiddenCurve = buatKurva3D(3, 3);
    var hiddenCurve = new Objek(GL, b_hiddenCurve.vertex, b_hiddenCurve.faces, warnaHitam);
    bajuBiru.addChild(hiddenCurve);

    return root;
}

export function animasiWhiteBomber(time) {
}
