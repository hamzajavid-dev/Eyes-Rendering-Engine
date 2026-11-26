(function () {
  'use strict';

  const screen = document.querySelector('.screen');
  const renderer = document.querySelector('.animation-renderer');
  const wash = document.querySelector('.spin-wash');
  const status = document.getElementById('animation-status');
  const replayButton = document.getElementById('surprise');
  const pupilSize = document.getElementById('pupil-size');
  const pupilSizeValue = document.getElementById('pupil-size-value');
  const pupilLength = document.getElementById('pupil-length');
  const pupilLengthValue = document.getElementById('pupil-length-value');
  const eyeColor = document.getElementById('eye-color');
  const pupilColor = document.getElementById('pupil-color');

  // Seconds from the start of the show.
  const introEnd = 3;
  const accelerationEnd = 5;
  const colorStart = 6;
  const decelerationStart = 9.5;
  const spinEnd = 11.5;
  const dizzyEnd = 14.5;
  const showEnd = 15.5;
  const maximumSpeed = 3200; // degrees per second
  const accelerationAngle = maximumSpeed * (accelerationEnd - introEnd) / 4;
  const cruiseAngle = accelerationAngle + maximumSpeed * (decelerationStart - accelerationEnd);
  const stoppingAngle = Math.round((cruiseAngle + maximumSpeed * (spinEnd - decelerationStart) / 3) / 360) * 360;

  let ready = false;
  let startedOnce = false;
  let playing = false;
  let elapsed = 0;
  let lastFrame = 0;
  let frameId = 0;
  let introBeats = 0;
  let currentColor = eyeColor.value;

  replayButton.disabled = true;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smooth = (value) => {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const mixColor = (from, to, amount) => {
    const a = parseInt(from.slice(1), 16);
    const b = parseInt(to.slice(1), 16);
    const t = clamp(amount, 0, 1);
    const channel = (shift) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
    return `#${[channel(16), channel(8), channel(0)].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
  };

  function updateRange(input, output) {
    const value = Number(input.value);
    const progress = (value - Number(input.min)) / (Number(input.max) - Number(input.min));
    output.value = `${value}%`;
    input.style.setProperty('--range-progress', `${progress * 100}%`);
  }

  function applyAppearance(color) {
    document.documentElement.style.setProperty('--eye', color);
    document.documentElement.style.setProperty('--eye2', color);
    window.LegacyEyes?.setAppearance(renderer, {
      eyeColor: color,
      pupilColor: pupilColor.value,
      pupilScale: Number(pupilSize.value) / 100,
      pupilLength: Number(pupilLength.value) / 100,
    });
  }

  function updateControls() {
    updateRange(pupilSize, pupilSizeValue);
    updateRange(pupilLength, pupilLengthValue);
    if (!playing || elapsed < colorStart) currentColor = eyeColor.value;
    applyAppearance(currentColor);
  }

  for (const input of [pupilSize, pupilLength, eyeColor, pupilColor]) {
    input.addEventListener('input', updateControls);
    input.addEventListener('change', updateControls);
  }
  updateControls();

  function cycleColor(time) {
    const colors = [eyeColor.value, '#ff4565', '#a15bff', '#ffe258', '#37a9ff', eyeColor.value];
    const position = (((time - colorStart) % 3.5) / 3.5) * (colors.length - 1);
    const index = Math.min(colors.length - 2, Math.floor(position));
    return mixColor(colors[index], colors[index + 1], smooth(position - index));
  }

  function colorAt(time) {
    if (time < colorStart) return eyeColor.value;
    if (time < dizzyEnd) return cycleColor(time);
    return mixColor(cycleColor(dizzyEnd), eyeColor.value, smooth((time - dizzyEnd) / (showEnd - dizzyEnd)));
  }

  function spinSpeed(time) {
    if (time < introEnd || time >= spinEnd) return 0;
    if (time < accelerationEnd) return Math.pow((time - introEnd) / (accelerationEnd - introEnd), 3);
    if (time < decelerationStart) return 1;
    return Math.pow(1 - (time - decelerationStart) / (spinEnd - decelerationStart), 2);
  }

  function spinAngle(time) {
    if (time < introEnd) return 0;
    if (time < accelerationEnd) {
      const part = (time - introEnd) / (accelerationEnd - introEnd);
      return accelerationAngle * Math.pow(part, 4);
    }
    if (time < decelerationStart) return accelerationAngle + maximumSpeed * (time - accelerationEnd);
    if (time < spinEnd) {
      const part = (time - decelerationStart) / (spinEnd - decelerationStart);
      return cruiseAngle + (stoppingAngle - cruiseAngle) * (1 - Math.pow(1 - part, 3));
    }
    return stoppingAngle;
  }

  function introLook(time) {
    const points = [
      [0, 0, 0], [0.65, -0.48, 0.12], [1.25, 0.48, -0.08],
      [1.95, 0.02, 0.35], [2.7, 0, 0], [introEnd, 0, 0],
    ];
    for (let i = 0; i < points.length - 1; i++) {
      if (time <= points[i + 1][0]) {
        const from = points[i], to = points[i + 1];
        const part = smooth((time - from[0]) / (to[0] - from[0]));
        return { x: from[1] + (to[1] - from[1]) * part, y: from[2] + (to[2] - from[2]) * part };
      }
    }
    return { x: 0, y: 0 };
  }

  function drawSequence(time) {
    currentColor = colorAt(time);
    applyAppearance(currentColor);

    const speed = spinSpeed(time);
    renderer.style.transform = `rotate(${spinAngle(time).toFixed(2)}deg)`;
    renderer.style.filter = speed > 0 ? `blur(${(speed * 20).toFixed(1)}px)` : 'none';
    wash.style.setProperty('--spin-color', currentColor);
    wash.style.opacity = String(0.96 * smooth((speed - 0.15) / 0.75));

    const arriving = smooth((time - spinEnd) / 0.5);
    const leaving = 1 - smooth((time - dizzyEnd) / (showEnd - dizzyEnd));
    const dizzy = arriving * leaving;
    window.LegacyEyes.setEffects(renderer, {
      spiral: dizzy,
      stars: dizzy,
      phase: time * Math.PI * 1.8,
    });

    if (time < introEnd) {
      screen.dataset.phase = 'intro';
      window.LegacyEyes.setLook(renderer, introLook(time));
      if (time >= 0.45 && !(introBeats & 1)) { window.LegacyEyes.blink(renderer); introBeats |= 1; }
      if (time >= 1.45 && !(introBeats & 2)) { window.LegacyEyes.triggerRandom(renderer); introBeats |= 2; }
      if (time >= 2.4 && !(introBeats & 4)) { window.LegacyEyes.blink(renderer); introBeats |= 4; }
    } else {
      window.LegacyEyes.setLook(renderer, null);
      screen.dataset.phase = time < colorStart ? 'spin' :
        time < decelerationStart ? 'rainbow' :
        time < spinEnd ? 'slowdown' :
        time < dizzyEnd ? 'dizzy' :
        time < showEnd ? 'restore' : 'done';
    }
  }

  function frame(now) {
    if (!playing) return;
    const delta = document.hidden ? 0 : Math.min(now - lastFrame, 100);
    lastFrame = now;
    elapsed = Math.min(showEnd, elapsed + Math.max(0, delta) / 1000);
    drawSequence(elapsed);
    if (elapsed >= showEnd) {
      playing = false;
      renderer.style.transform = 'rotate(0deg)';
      renderer.style.filter = 'none';
      wash.style.opacity = '0';
      window.LegacyEyes.freeze(renderer);
      return;
    }
    frameId = requestAnimationFrame(frame);
  }

  function replay() {
    if (!ready) return;
    cancelAnimationFrame(frameId);
    if (startedOnce) window.LegacyEyes.restart(renderer);
    startedOnce = true;
    playing = true;
    elapsed = 0;
    introBeats = 0;
    lastFrame = performance.now();
    drawSequence(0);
    frameId = requestAnimationFrame(frame);
  }

  renderer.addEventListener('legacyeyesready', () => {
    ready = true;
    status.hidden = true;
    replayButton.disabled = false;
    replay();
  });

  window.addEventListener('legacyeyeserror', () => {
    status.textContent = 'Eyes could not load. Please refresh the page.';
  });
  document.addEventListener('visibilitychange', () => { lastFrame = performance.now(); });

  screen.addEventListener('click', replay);
  replayButton.addEventListener('click', replay);
  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof Element && event.target.matches('input, textarea, select, [contenteditable]')) return;
    if (event.key.toLowerCase() === 'r') replay();
  });

})();
