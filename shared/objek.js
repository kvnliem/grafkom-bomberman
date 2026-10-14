import { LIBS } from "./libs.js";

export class Objek {
    constructor(GL, vertex, faces, color) {
        this.GL = GL;
        this.vertex = vertex || [];
        this.faces = faces || [];
        this.color = color || [1, 1, 1];
        this.MOVEMATRIX = LIBS.get_I4();
        this.childs = [];

        // objek kosong (tanpa vertex) tetap bisa dipakai buat pivot / sendi
        if (this.faces.length > 0) {
            this.setup();
        }
    }

    addChild(objek) {
        this.childs.push(objek);
    }

    hitungNormal() {
        var v = this.vertex;
        var f = this.faces;
        var normal = new Array(v.length).fill(0);

        for (var i = 0; i < f.length; i += 3) {
            var a = f[i] * 3, b = f[i + 1] * 3, c = f[i + 2] * 3;

            var ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2];
            var wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];

            // cross product
            var nx = uy * wz - uz * wy;
            var ny = uz * wx - ux * wz;
            var nz = ux * wy - uy * wx;

            for (var idx of [a, b, c]) {
                normal[idx] += nx;
                normal[idx + 1] += ny;
                normal[idx + 2] += nz;
            }
        }

        for (var i = 0; i < normal.length; i += 3) {
            var panjang = Math.sqrt(normal[i] ** 2 + normal[i + 1] ** 2 + normal[i + 2] ** 2);
            if (panjang > 0) {
                normal[i] /= panjang;
                normal[i + 1] /= panjang;
                normal[i + 2] /= panjang;
            }
        }
        return normal;
    }

    setup() {
        var GL = this.GL;
        var normal = this.hitungNormal();

        // x, y, z, nx, ny, nz
        var data = [];
        for (var i = 0; i < this.vertex.length; i += 3) {
            data.push(this.vertex[i], this.vertex[i + 1], this.vertex[i + 2]);
            data.push(normal[i], normal[i + 1], normal[i + 2]);
        }

        this.VERTEX_BUFFER = GL.createBuffer();
        GL.bindBuffer(GL.ARRAY_BUFFER, this.VERTEX_BUFFER);
        GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(data), GL.STATIC_DRAW);

        this.FACES_BUFFER = GL.createBuffer();
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.FACES_BUFFER);
        GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), GL.STATIC_DRAW);
    }

    render(parentMatrix) {
        var GL = this.GL;
        var shader = Objek.shader;
        var matrix = LIBS.multiply(parentMatrix, this.MOVEMATRIX);

        if (this.faces.length > 0) {
            GL.bindBuffer(GL.ARRAY_BUFFER, this.VERTEX_BUFFER);
            GL.vertexAttribPointer(shader.position, 3, GL.FLOAT, false, 4 * 6, 0);
            GL.vertexAttribPointer(shader.normal, 3, GL.FLOAT, false, 4 * 6, 4 * 3);

            GL.uniformMatrix4fv(shader.Mmatrix, false, matrix);
            GL.uniform3f(shader.color, this.color[0], this.color[1], this.color[2]);

            GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.FACES_BUFFER);
            GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);
        }

        for (var child of this.childs) {
            child.render(matrix);
        }
    }
}

// diisi sama engine.js
Objek.shader = null;
