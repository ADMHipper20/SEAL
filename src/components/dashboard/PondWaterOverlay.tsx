import React, { useEffect, useRef } from 'react';

/**
 * PondWaterOverlay - Realistic 3D Aquaculture Water & Aerator Simulation
 *
 * Implements:
 * 1. Precision paddlewheel rotor mechanics: 12 rotating blades turning continuously on their true shaft pivots.
 * 2. Directed aeration wakes: Organic churning froth plume and trailing hydrodynamic current wakes (NO circular radar lines).
 * 3. Multi-harmonic organic surface waves: Circular pond current + diagonal isometric swells + micro-ripples.
 * 4. Specular sunlight facets: Soft undulating glistening highlights along wave crests (NO artificial cross flares).
 * 5. Volumetric water depth & caustics: Soft aquatic light ribbons with screen blend mode.
 * 6. High-DPI support, zero layout shift, and full prefers-reduced-motion fallback.
 */
export const PondWaterOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isReducedMotion = false;
    let width = 0;
    let height = 0;
    let time = 0;

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    isReducedMotion = mediaQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    // Resize handler with high DPI support
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(canvas);
    updateSize();

    // The 4 paddlewheel aerators in pond_3d.png (normalized coordinates 0..1 in 1024x1024)
    const aerators = [
      {
        id: 'north',
        name: 'Aerator Utara',
        wheels: [
          { u: 0.455, v: 0.340 },
          { u: 0.485, v: 0.358 },
          { u: 0.515, v: 0.376 }
        ],
        speed: 4.6,
        phaseOffset: 0.0,
        flowDir: { dx: -0.82, dy: 0.57 }, // Circulation flow heading towards west
        shaftAngle: 0.55 // isometric shaft angle
      },
      {
        id: 'east',
        name: 'Aerator Timur',
        wheels: [
          { u: 0.678, v: 0.463 },
          { u: 0.705, v: 0.480 },
          { u: 0.732, v: 0.497 }
        ],
        speed: 4.8,
        phaseOffset: 1.5,
        flowDir: { dx: -0.65, dy: 0.76 }, // Circulation flow heading towards south
        shaftAngle: 0.55
      },
      {
        id: 'south',
        name: 'Aerator Selatan',
        wheels: [
          { u: 0.450, v: 0.620 },
          { u: 0.478, v: 0.638 },
          { u: 0.506, v: 0.656 }
        ],
        speed: 4.5,
        phaseOffset: 2.7,
        flowDir: { dx: 0.82, dy: -0.57 }, // Circulation flow heading towards east
        shaftAngle: 0.55
      },
      {
        id: 'west',
        name: 'Aerator Barat',
        wheels: [
          { u: 0.226, v: 0.478 },
          { u: 0.252, v: 0.496 },
          { u: 0.278, v: 0.514 }
        ],
        speed: 4.7,
        phaseOffset: 3.9,
        flowDir: { dx: 0.65, dy: -0.76 }, // Circulation flow heading towards north
        shaftAngle: 0.55
      }
    ];

    // Trailing hydrodynamic wakes behind aerators (curved flow lines, NOT radar circles)
    const wakes = aerators.flatMap((a) => [
      { aeratorId: a.id, progress: 0.05, speed: 0.006, width: 22 },
      { aeratorId: a.id, progress: 0.30, speed: 0.006, width: 36 },
      { aeratorId: a.id, progress: 0.55, speed: 0.006, width: 50 },
      { aeratorId: a.id, progress: 0.80, speed: 0.006, width: 66 }
    ]);

    // Micro-droplet spray particles
    const sprayParticles = Array.from({ length: 36 }).map((_, i) => ({
      aeratorIdx: i % 4,
      wheelIdx: Math.floor(i / 4) % 3,
      age: (i * 0.09) % 1,
      speed: 0.035 + (i % 4) * 0.007,
      lateralOffset: ((i % 5) - 2) * 0.22,
      size: 1.0 + (i % 3) * 0.6
    }));

    // Natural specular light facets on wave crests (soft, non-crosshair)
    const specularFacets = [
      { u: 0.34, v: 0.42, scale: 1.0, freq: 1.1, phase: 0.3 },
      { u: 0.42, v: 0.38, scale: 1.2, freq: 1.3, phase: 1.8 },
      { u: 0.52, v: 0.41, scale: 0.9, freq: 0.9, phase: 2.9 },
      { u: 0.61, v: 0.43, scale: 1.1, freq: 1.4, phase: 4.1 },
      { u: 0.38, v: 0.48, scale: 0.8, freq: 1.0, phase: 0.9 },
      { u: 0.48, v: 0.46, scale: 1.3, freq: 1.2, phase: 3.4 },
      { u: 0.57, v: 0.49, scale: 1.0, freq: 1.5, phase: 5.2 },
      { u: 0.65, v: 0.52, scale: 0.7, freq: 0.8, phase: 1.2 },
      { u: 0.44, v: 0.54, scale: 1.1, freq: 1.3, phase: 2.4 },
      { u: 0.53, v: 0.56, scale: 0.9, freq: 1.1, phase: 4.7 },
      { u: 0.32, v: 0.50, scale: 0.8, freq: 1.2, phase: 3.1 },
      { u: 0.71, v: 0.47, scale: 0.9, freq: 1.0, phase: 0.5 }
    ];

    // Main animation loop
    const render = () => {
      if (width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Coordinate mapping from 1:1 image (object-fit: cover, object-position: center 38%)
      const containerRatio = width / height;
      const imgRatio = 1.0;

      let imgW: number;
      let imgH: number;
      let imgX: number;
      let imgY: number;

      if (containerRatio > imgRatio) {
        imgW = width;
        imgH = width / imgRatio;
        imgX = 0;
        imgY = (height - imgH) * 0.38;
      } else {
        imgH = height;
        imgW = height * imgRatio;
        imgX = (width - imgW) * 0.5;
        imgY = (height - imgH) * 0.38;
      }

      const toScreen = (u: number, v: number) => ({
        x: imgX + u * imgW,
        y: imgY + v * imgH
      });

      // Tank inner water basin boundary polygon
      const pTop = toScreen(0.490, 0.312);
      const pRight = toScreen(0.825, 0.485);
      const pBottom = toScreen(0.495, 0.718);
      const pLeft = toScreen(0.165, 0.515);

      ctx.save();

      // Clip strictly to the inner water basin boundary
      ctx.beginPath();
      ctx.moveTo(pTop.x, pTop.y);
      ctx.lineTo(pRight.x, pRight.y);
      ctx.lineTo(pBottom.x, pBottom.y);
      ctx.lineTo(pLeft.x, pLeft.y);
      ctx.closePath();
      ctx.clip();

      if (!isReducedMotion) {
        time += 0.022;
      }

      // =========================================================================
      // 1. Organic Ambient Depth & Circulation Light Drift
      // =========================================================================
      const centerPond = toScreen(0.495, 0.505);

      // Soft ambient light variation that breathes slowly
      const lightDriftX = centerPond.x + Math.sin(time * 0.18) * (imgW * 0.03);
      const lightDriftY = centerPond.y + Math.cos(time * 0.15) * (imgH * 0.025);

      const waterDepthGrad = ctx.createRadialGradient(
        lightDriftX, lightDriftY, imgW * 0.03,
        lightDriftX, lightDriftY, imgW * 0.38
      );
      waterDepthGrad.addColorStop(0, 'rgba(186, 230, 253, 0.14)');
      waterDepthGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.06)');
      waterDepthGrad.addColorStop(1, 'rgba(14, 116, 144, 0.00)');

      ctx.fillStyle = waterDepthGrad;
      ctx.fillRect(0, 0, width, height);

      // =========================================================================
      // 2. Multi-Harmonic Organic Caustic Light Web (Hydrodynamic Circulation)
      // =========================================================================
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const numCausticBands = 9;
      const isoAngle = -0.48; // -27.5 deg isometric slant
      const cosIso = Math.cos(isoAngle);
      const sinIso = Math.sin(isoAngle);

      for (let i = 0; i < numCausticBands; i++) {
        const bandFrac = i / numCausticBands;
        const baseOffset = bandFrac * imgH * 0.38 + imgH * 0.31;
        const bandAlpha = 0.07 + Math.sin(time * 0.8 + i * 0.9) * 0.03;

        ctx.strokeStyle = `rgba(224, 242, 254, ${bandAlpha.toFixed(3)})`;
        ctx.lineWidth = 1.25 + (i % 2) * 0.4;

        ctx.beginPath();
        let started = false;
        const steps = 40;

        for (let s = 0; s <= steps; s++) {
          const uStep = (s / steps) * imgW * 0.66 - imgW * 0.08;

          // Multi-harmonic wave displacement combining circular vortex + linear swells
          const waveElevation =
            Math.sin(uStep * 0.024 + time * 1.35 + i * 0.8) * 3.4 +
            Math.cos(uStep * 0.016 - time * 0.85 + i * 1.3) * 2.1 +
            Math.sin(uStep * 0.038 + time * 2.1 + i * 0.5) * 1.2;

          const px = imgX + imgW * 0.49 + uStep * cosIso - (baseOffset + waveElevation) * sinIso;
          const py = imgY + imgH * 0.50 + uStep * sinIso + (baseOffset + waveElevation) * cosIso;

          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }
      ctx.restore();

      // =========================================================================
      // 3. Directional Trailing Hydrodynamic Wakes from Aerators (NO radar rings!)
      // =========================================================================
      ctx.save();
      wakes.forEach((wake) => {
        if (!isReducedMotion) {
          wake.progress += wake.speed;
          if (wake.progress >= 1) wake.progress = 0;
        }

        const aerator = aerators.find((a) => a.id === wake.aeratorId);
        if (!aerator) return;

        // Origin of the wake is the center of the aerator shaft
        const midWheel = aerator.wheels[1];
        const origin = toScreen(midWheel.u, midWheel.v);

        // Distance traveled downstream
        const travelDistance = wake.progress * (imgW * 0.16);
        const wakeCenterX = origin.x + aerator.flowDir.dx * travelDistance;
        const wakeCenterY = origin.y + aerator.flowDir.dy * travelDistance;

        // Parabolic lateral dispersion of the wake
        const lateralSpan = (wake.width + wake.progress * 48) * (imgW / 700);
        const perpX = -aerator.flowDir.dy * lateralSpan;
        const perpY = aerator.flowDir.dx * lateralSpan;

        // Smooth fade out as wake dissolves into current
        const alpha = Math.sin(wake.progress * Math.PI) * 0.18 * (1 - wake.progress * 0.5);

        if (alpha > 0.01) {
          ctx.strokeStyle = `rgba(240, 249, 255, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 1.3;

          ctx.beginPath();
          // Gentle curved crescent wake line matching the water circulation flow
          const tipX = wakeCenterX + aerator.flowDir.dx * (lateralSpan * 0.35);
          const tipY = wakeCenterY + aerator.flowDir.dy * (lateralSpan * 0.35);

          ctx.moveTo(wakeCenterX - perpX, wakeCenterY - perpY);
          ctx.quadraticCurveTo(tipX, tipY, wakeCenterX + perpX, wakeCenterY + perpY);
          ctx.stroke();
        }
      });
      ctx.restore();

      // =========================================================================
      // 4. Rotating Paddlewheels & Churning Aeration Foam Plume
      // =========================================================================
      const wheelRadius = imgW * 0.0155; // Proportional scale matching the 3D model
      const numBlades = 8;
      const cosProj = Math.cos(-0.55);
      const sinProj = Math.sin(-0.55);

      aerators.forEach((aerator) => {
        const rotorAngle = isReducedMotion ? 0 : time * aerator.speed + aerator.phaseOffset;

        aerator.wheels.forEach((wheelNorm, wIdx) => {
          const wPos = toScreen(wheelNorm.u, wheelNorm.v);

          // Realistic Churning Aeration Foam directly under the paddle impact zone
          const foamPulse = Math.sin(time * 14 + aerator.phaseOffset + wIdx * 1.4) * 1.8;
          const foamBaseR = wheelRadius * 1.5 + foamPulse;

          // Elongated froth plume drifting in the flow direction
          const plumeOffsetDist = wheelRadius * 0.65;
          const plumeCenterX = wPos.x + aerator.flowDir.dx * plumeOffsetDist;
          const plumeCenterY = wPos.y + aerator.flowDir.dy * plumeOffsetDist;

          const foamGrad = ctx.createRadialGradient(
            plumeCenterX, plumeCenterY, 1,
            plumeCenterX, plumeCenterY, foamBaseR
          );
          foamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
          foamGrad.addColorStop(0.4, 'rgba(224, 242, 254, 0.55)');
          foamGrad.addColorStop(0.75, 'rgba(186, 230, 253, 0.22)');
          foamGrad.addColorStop(1, 'rgba(255, 255, 255, 0.00)');

          ctx.fillStyle = foamGrad;
          ctx.beginPath();
          // Isometric rotated ellipse for the froth footprint
          ctx.ellipse(plumeCenterX, plumeCenterY, foamBaseR * 1.4, foamBaseR * 0.72, -0.45, 0, Math.PI * 2);
          ctx.fill();

          // Draw the 8 paddle blades rotating on the shaft
          for (let b = 0; b < numBlades; b++) {
            const bladePhi = rotorAngle + (b * Math.PI * 2) / numBlades;
            const cosPhi = Math.cos(bladePhi);
            const sinPhi = Math.sin(bladePhi);

            // Hub base point on shaft
            const hubR = wheelRadius * 0.28;
            const bx0 = wPos.x + hubR * (cosPhi * cosProj);
            const by0 = wPos.y + hubR * (cosPhi * sinProj - sinPhi * 1.15);

            // Blade tip point
            const bx1 = wPos.x + wheelRadius * (cosPhi * cosProj);
            const by1 = wPos.y + wheelRadius * (cosPhi * sinProj - sinPhi * 1.15);

            // Paddle scoop width perpendicular vector
            const scoopW = wheelRadius * 0.24;
            const px0 = bx1 - scoopW * sinPhi * 0.45;
            const py0 = by1 + scoopW * cosPhi * 0.35;
            const px1 = bx1 + scoopW * sinPhi * 0.45;
            const py1 = by1 - scoopW * cosPhi * 0.35;

            // Differentiate blade in air vs blade dipping in water
            const inAir = sinPhi > 0;
            ctx.save();
            ctx.strokeStyle = inAir ? '#1e293b' : 'rgba(30, 41, 59, 0.60)';
            ctx.lineWidth = 2.0;
            ctx.lineCap = 'round';

            // Spoke
            ctx.beginPath();
            ctx.moveTo(bx0, by0);
            ctx.lineTo(bx1, by1);
            ctx.stroke();

            // Paddle scoop head
            ctx.strokeStyle = inAir ? '#334155' : 'rgba(51, 65, 85, 0.60)';
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.moveTo(px0, py0);
            ctx.lineTo(px1, py1);
            ctx.stroke();

            // Natural ambient sunlight sheen on top blade edges
            if (inAir && cosPhi > 0.15) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
              ctx.lineWidth = 0.9;
              ctx.beginPath();
              ctx.moveTo(bx0, by0);
              ctx.lineTo(bx1, by1);
              ctx.stroke();
            }

            ctx.restore();
          }

          // Metallic Central Hub Disc
          ctx.save();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(wPos.x, wPos.y, wheelRadius * 0.26, wheelRadius * 0.20, -0.45, 0, Math.PI * 2);
          ctx.fill();

          // Hub Bolt
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.arc(wPos.x, wPos.y, wheelRadius * 0.11, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      });

      // =========================================================================
      // 5. Active Micro-Droplets Ejected Along Rotation Stream
      // =========================================================================
      if (!isReducedMotion) {
        ctx.save();
        ctx.fillStyle = '#ffffff';

        sprayParticles.forEach((sp) => {
          sp.age += sp.speed;
          if (sp.age >= 1) sp.age = 0;

          const aerator = aerators[sp.aeratorIdx];
          const wheel = aerator.wheels[sp.wheelIdx];
          const basePos = toScreen(wheel.u, wheel.v);

          // Parabolic trajectory along flow direction
          const travelDist = sp.age * (wheelRadius * 3.4);
          const px = basePos.x + (aerator.flowDir.dx * travelDist) + (sp.lateralOffset * travelDist * 0.35);
          const py = basePos.y + (aerator.flowDir.dy * travelDist) - (Math.sin(sp.age * Math.PI) * 4.2);

          const alpha = (1 - sp.age) * 0.75;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(px, py, sp.size * (1 - sp.age * 0.25), 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      }

      // =========================================================================
      // 6. Natural Specular Glistening Highlights (Soft Facets, NO Plus Signs!)
      // =========================================================================
      ctx.save();
      specularFacets.forEach((facet) => {
        // Natural swelling and shimmering frequency
        const intensity = Math.sin(time * facet.freq + facet.phase);

        if (intensity > 0.25) {
          const normIntensity = (intensity - 0.25) / 0.75; // 0..1
          const pos = toScreen(
            facet.u + Math.sin(time * 0.5 + facet.phase) * 0.008,
            facet.v + Math.cos(time * 0.4 + facet.phase) * 0.005
          );

          const radiusX = (3.2 + normIntensity * 3.8) * facet.scale * (imgW / 700);
          const radiusY = (1.1 + normIntensity * 1.3) * facet.scale * (imgW / 700);

          // Soft organic elliptical highlight aligned with isometric wave crests
          const facetGrad = ctx.createRadialGradient(
            pos.x, pos.y, 0,
            pos.x, pos.y, radiusX
          );
          const alphaCenter = normIntensity * 0.52;
          facetGrad.addColorStop(0, `rgba(255, 255, 255, ${alphaCenter.toFixed(3)})`);
          facetGrad.addColorStop(0.45, `rgba(224, 242, 254, ${(alphaCenter * 0.4).toFixed(3)})`);
          facetGrad.addColorStop(1, 'rgba(255, 255, 255, 0.00)');

          ctx.fillStyle = facetGrad;
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y, radiusX, radiusY, -0.48, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();

      ctx.restore(); // End water basin clipping

      if (!isReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pond-water-canvas"
      aria-hidden="true"
    />
  );
};

