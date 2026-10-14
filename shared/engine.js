import { LIBS } from "./libs.js";
import { Objek } from "./objek.js";

// buatScene(GL) harus return { objek: [...], animasi: function (time) {...} }
export function mulaiScene(buatScene, jarakKamera) {
    var CANVAS = document.getElementById("mycanvas");
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    /*========================= MOUSE ========================= */
    var AMORTIZATION = 0.95;
    var drag = false;
    var x_prev, y_prev;
    var dX = 0, dY = 0;
    var THETA = 0, PHI = 0.3;
    var jarak = jarakKamera || 10;

    var mouseDown = function (e) {
        drag = true;
        x_prev = e.pageX, y_prev = e.pageY;
        e.preventDefault();
        return false;
    };

    var mouseUp = function (e) {
        drag = false;
    };

    var mouseMove = function (e) {
        if (!drag) return false;
        dX = (e.pageX - x_prev) * Math.PI / CANVAS.width;
        dY = (e.pageY - y_prev) * Math.PI / CANVAS.height;
        THETA += dX;
        PHI += dY;
        x_prev = e.pageX, y_prev = e.pageY;
        e.preventDefault();
    };

    // scroll buat zoom
    var mouseWheel = function (e) {
        jarak += e.deltaY * 0.01;
        jarak = Math.min(Math.max(jarak, 2), 40);
        e.preventDefault();
    };

    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", mouseMove, false);
    CANVAS.addEventListener("wheel", mouseWheel, false);

    /*========================= SHADERS ========================= */
    var shader_vertex_source = `
        attribute vec3 position;
        attribute vec3 normal;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        varying vec3 vNormal;
        varying vec3 vView;

        void main(void) {
            vec4 posView = Vmatrix * Mmatrix * vec4(position, 1.);
            gl_Position = Pmatrix * posView;
            vNormal = vec3(Vmatrix * Mmatrix * vec4(normal, 0.));
            vView = posView.xyz;
        }`;

    var shader_fragment_source = `
        precision mediump float;
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vView;

        void main(void) {
            vec3 N = normalize(vNormal);
            vec3 V = normalize(-vView);
            // biar urutan faces kebalik tetap kena cahaya
            if (dot(N, V) < 0.) N = -N;

            vec3 L = normalize(vec3(0.4, 0.8, 0.6));
            float diffuse = max(dot(N, L), 0.);
            vec3 R = reflect(-L, N);
            float specular = pow(max(dot(R, V), 0.), 20.) * 0.3;

            vec3 warna = uColor * (0.35 + 0.65 * diffuse) + vec3(specular);
            gl_FragColor = vec4(warna, 1.);
        }`;

    var compile_shader = function (source, type, typeString) {
        var shader = GL.createShader(type);
        GL.shaderSource(shader, source);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
            return false;
        }
        return shader;
    };

    var shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    var shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);
    GL.linkProgram(SHADER_PROGRAM);

    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");

    Objek.shader = {
        position: GL.getAttribLocation(SHADER_PROGRAM, "position"),
        normal: GL.getAttribLocation(SHADER_PROGRAM, "normal"),
        Mmatrix: GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix"),
        color: GL.getUniformLocation(SHADER_PROGRAM, "uColor")
    };

    GL.enableVertexAttribArray(Objek.shader.position);
    GL.enableVertexAttribArray(Objek.shader.normal);
    GL.useProgram(SHADER_PROGRAM);

    /*========================= MATRIX ========================= */
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 0.5, 100);
    var VIEWMATRIX = LIBS.get_I4();

    window.addEventListener("resize", function () {
        CANVAS.width = window.innerWidth;
        CANVAS.height = window.innerHeight;
        PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 0.5, 100);
    });

    /*========================= LANTAI ========================= */
    var lantai = new Objek(GL,
        [
            -10, 0, -10,
            10, 0, -10,
            10, 0, 10,
            -10, 0, 10
        ],
        [0, 2, 1, 0, 3, 2],
        [0.45, 0.5, 0.45]
    );

    var scene = buatScene(GL);

    /*========================= DRAWING ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.15, 0.15, 0.2, 1.0);
    GL.clearDepth(1.0);

    var animate = function (time) {
        if (!drag) {
            dX *= AMORTIZATION, dY *= AMORTIZATION;
            THETA += dX, PHI += dY;
        }
        PHI = Math.min(Math.max(PHI, -0.2), 1.5);

        LIBS.set_I4(VIEWMATRIX);
        LIBS.rotateY(VIEWMATRIX, THETA);
        LIBS.rotateX(VIEWMATRIX, PHI);
        LIBS.set_position(VIEWMATRIX, 0, -1, -jarak);

        if (scene.animasi) scene.animasi(time);

        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);

        lantai.render(LIBS.get_I4());
        for (var objek of scene.objek) {
            objek.render(LIBS.get_I4());
        }

        GL.flush();
        window.requestAnimationFrame(animate);
    };
    animate(0);
}
