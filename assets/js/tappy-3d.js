/**
 * 3D Tappy character (Three.js)
 * Face drawn as Canvas2D texture, matched to reference artwork.
 */
(function () {
  var container = document.getElementById("tappy-3d-container");
  if (!container) return;

  var width = container.clientWidth;
  var height = Math.min(container.clientHeight || 420, 500);
  var scene, camera, renderer, group, clock, wavingArm;
  var BODY_COLOR = 0x8ad8f5;

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function createFaceTexture() {
    var S = 1024;
    var cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    var c = cv.getContext("2d");
    c.clearRect(0, 0, S, S);

    var cx = 512;
    var cy = 512;

    // -- EYEBROWS (thicker blue bars, slanting the OTHER way: / \ ) --
    var bW = 250, bH = 60; // Made longer and taller
    var eyeR = 138;
    var eyeLX = cx - 190;
    var eyeLY = cy - 140;
    var eyeRX = cx + 190;
    var eyeRY = cy - 120;
    
    c.fillStyle = "#1da4d4";

    c.save();
    c.translate(eyeLX - 25, eyeLY - eyeR - 55); // Adjusted position for bigger size
    c.rotate(-0.25);
    rrect(c, -bW / 2, -bH / 2, bW, bH, 8); // Slightly rounder corners for the bigger size
    c.fill();
    c.restore();

    c.save();
    c.translate(eyeRX + 25, eyeRY - eyeR - 55); // Adjusted position for bigger size
    c.rotate(0.25);
    rrect(c, -bW / 2, -bH / 2, bW, bH, 8); // Slightly rounder corners for the bigger size
    c.fill();
    c.restore();

    // -- MOUTH (wide D-shaped smile, tilted) --
    c.save();
    c.translate(cx + 10, cy + 95); 
    c.rotate(-0.1); // Tilt right side up more noticeably

    // Outer dark rim
    c.fillStyle = "#11465a";
    c.beginPath();
    c.moveTo(-160, -10);
    c.quadraticCurveTo(0, 15, 160, -10); // top edge slightly curved down
    c.bezierCurveTo(160, 160, 90, 175, 0, 175); 
    c.bezierCurveTo(-90, 175, -160, 160, -160, -10);
    c.fill();

    // Inner dark mouth
    c.fillStyle = "#092e3d";
    c.beginPath();
    c.moveTo(-140, -1);
    c.quadraticCurveTo(0, 20, 140, -1); 
    c.bezierCurveTo(140, 140, 80, 155, 0, 155); 
    c.bezierCurveTo(-80, 155, -140, 140, -140, -1); 
    c.fill();
    
    c.restore();

    return new THREE.CanvasTexture(cv);
  }

  function init() {
    scene = new THREE.Scene();
    scene.background = null;

    camera = new THREE.PerspectiveCamera(23, width / height, 0.1, 100);
    camera.position.set(0, 0.05, 6);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "auto";

    group = new THREE.Group();

    var bodyGeo = new THREE.SphereGeometry(1, 48, 48);
    var bodyMat = new THREE.MeshBasicMaterial({ color: BODY_COLOR });

    var body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    var faceTex = createFaceTexture();
    var facePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.88, 1.88),
      new THREE.MeshBasicMaterial({
        map: faceTex,
        transparent: true,
        depthWrite: false,
      })
    );
    facePlane.position.z = 1.005;
    facePlane.renderOrder = 1;
    group.add(facePlane);

    // Left arm: more of a rounded stub/protrusion than a long arm
    var armL = new THREE.Mesh(bodyGeo, bodyMat.clone());
    armL.scale.set(0.18, 0.28, 0.18);
    armL.position.set(-0.85, -0.35, 0.25);
    armL.rotation.z = 0.25;
    group.add(armL);

    // Right arm: raised up, wavy rounded stub
    wavingArm = new THREE.Mesh(bodyGeo, bodyMat.clone());
    wavingArm.scale.set(0.18, 0.30, 0.18);
    wavingArm.position.set(0.85, 0.25, 0.25);
    wavingArm.rotation.z = -0.4;
    group.add(wavingArm);

    // Feet: rounder, closer to the body like small bumps
    var footL = new THREE.Mesh(bodyGeo, bodyMat.clone());
    footL.scale.set(0.18, 0.18, 0.18);
    footL.position.set(-0.35, -0.9, 0.25);
    group.add(footL);

    var footR = new THREE.Mesh(bodyGeo, bodyMat.clone());
    footR.scale.set(0.18, 0.18, 0.18);
    footR.position.set(0.35, -0.9, 0.25);
    group.add(footR);

    // --- 3D EYES (Protruding orbs) ---
    var eyeGeo = new THREE.SphereGeometry(0.36, 32, 32);
    var eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    var pupilGeo = new THREE.SphereGeometry(0.18, 32, 32);
    var pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    // Left Eye
    var eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    // Position carefully to match reference proportions
    eyeL.position.set(-0.35, 0.18, 0.82);
    eyeL.scale.set(0.9, 0.9, 0.5); // Flattened back-to-front so it's a "bump"
    // Tilt the eye outwards slightly along the sphere surface
    eyeL.rotation.y = -0.3;
    eyeL.rotation.x = -0.2;
    group.add(eyeL);

    var pupilL = new THREE.Mesh(pupilGeo, pupilMat);
    // Pupil pushed to front, low down in the eye
    pupilL.position.set(0.07, -0.05, 0.35);
    pupilL.scale.set(0.9, 0.9, 0.4);
    eyeL.add(pupilL);

    // Right Eye
    var eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.30, 0.20, 0.85);
    eyeR.scale.set(0.9, 0.9, 0.5);
    eyeR.rotation.y = 0.3;
    eyeR.rotation.x = -0.2;
    group.add(eyeR);

    var pupilR = new THREE.Mesh(pupilGeo, pupilMat);
    pupilR.position.set(-0.07, -0.05, 0.35);
    pupilR.scale.set(0.9, 0.9, 0.4);
    eyeR.add(pupilR);

    scene.add(group);
    clock = new THREE.Clock();

    // Interaction variables
    var isDragging = false;
    var previousMousePosition = { x: 0, y: 0 };
    var targetRotation = { x: 0, y: 0 };
    
    // Smooth dampening factor
    var damping = 0.1;

    // Mouse / Touch events
    renderer.domElement.addEventListener('mousedown', onPointerDown, false);
    renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: false });
    
    document.addEventListener('mousemove', onPointerMove, false);
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    
    document.addEventListener('mouseup', onPointerUp, false);
    document.addEventListener('touchend', onPointerUp, false);

    function onPointerDown(e) {
      isDragging = true;
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      previousMousePosition = { x: clientX, y: clientY };
      renderer.domElement.style.cursor = 'grabbing';
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      // Prevent scrolling while dragging on mobile
      if (e.touches) e.preventDefault();
      
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;

      var deltaMove = {
        x: clientX - previousMousePosition.x,
        y: clientY - previousMousePosition.y
      };

      // Add to target rotation based on movement
      targetRotation.y += deltaMove.x * 0.01;
      targetRotation.x += deltaMove.y * 0.01;

      previousMousePosition = { x: clientX, y: clientY };
    }

    function onPointerUp(e) {
      isDragging = false;
      renderer.domElement.style.cursor = 'grab';
    }
    
    renderer.domElement.style.cursor = 'grab';
    
    // Make targetRotation globally accessible for the animate loop
    window.tappyTargetRotation = targetRotation;
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!renderer || !scene || !camera) return;
    var t = clock.getElapsedTime();
    
    // Apply idle animation + drag rotation
    var tr = window.tappyTargetRotation || { x: 0, y: 0 };
    
    // Smoothly interpolate current rotation towards target rotation
    group.rotation.x += (tr.x - group.rotation.x) * 0.1;
    group.rotation.y += (tr.y + Math.sin(t * 0.22) * 0.035 - group.rotation.y) * 0.1;
    
    // Spring back to center slowly when not dragging
    tr.x *= 0.95;
    tr.y *= 0.95;

    group.position.y = Math.sin(t * 0.5) * 0.008;
    if (wavingArm) wavingArm.rotation.z = -0.55 + Math.sin(t * 1.4) * 0.06;
    
    renderer.render(scene, camera);
  }

  function onResize() {
    if (!container || !camera || !renderer) return;
    width = container.clientWidth;
    height = Math.min(container.clientHeight || 420, 500);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  if (typeof THREE === "undefined") {
    var s = document.createElement("script");
    s.src = "https://unpkg.com/three@0.160.0/build/three.min.js";
    s.onload = function () {
      init();
      animate();
      window.addEventListener("resize", onResize);
    };
    document.head.appendChild(s);
  } else {
    init();
    animate();
    window.addEventListener("resize", onResize);
  }
})();
