/**
 * Creates high-fidelity realistic synthetic fundus retinal images
 * rendered onto canvas elements to produce standalone Data URLs.
 * Works 100% offline, zero bandwidth required for rural settings.
 */

function drawFundus(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Background dark surrounding (fundus aperture circle)
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, 512, 512);

  // Retinal circular boundary
  ctx.save();
  ctx.beginPath();
  ctx.arc(256, 256, 230, 0, Math.PI * 2);
  ctx.clip();

  // Retinal base color (deep warm reddish-orange)
  const grad = ctx.createRadialGradient(256, 256, 50, 256, 256, 230);
  if (type === 'poor_quality') {
    grad.addColorStop(0, '#593223');
    grad.addColorStop(0.6, '#381f16');
    grad.addColorStop(1, '#1f100a');
  } else {
    grad.addColorStop(0, '#d95a2b');
    grad.addColorStop(0.4, '#b83b18');
    grad.addColorStop(0.8, '#8c240d');
    grad.addColorStop(1, '#571305');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle choroidal texture
  ctx.fillStyle = 'rgba(100, 20, 5, 0.15)';
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 12 + 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Optic Disc (Nasal side, yellowish-pink ellipse)
  const discX = 160;
  const discY = 250;
  const discGrad = ctx.createRadialGradient(discX, discY, 5, discX, discY, 32);
  discGrad.addColorStop(0, '#fff3c4');
  discGrad.addColorStop(0.6, '#f6ad55');
  discGrad.addColorStop(1, '#dd6b20');
  ctx.fillStyle = discGrad;
  ctx.beginPath();
  ctx.ellipse(discX, discY, 28, 34, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Optic Cup
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.ellipse(discX - 2, discY, 12, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fovea & Macula (Temporal side, dark red avascular zone)
  const foveaX = 330;
  const foveaY = 255;
  const maculaGrad = ctx.createRadialGradient(foveaX, foveaY, 2, foveaX, foveaY, 55);
  maculaGrad.addColorStop(0, '#380a03');
  maculaGrad.addColorStop(0.5, '#681408');
  maculaGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = maculaGrad;
  ctx.beginPath();
  ctx.arc(foveaX, foveaY, 55, 0, Math.PI * 2);
  ctx.fill();

  // Foveal reflex dot
  if (type !== 'poor_quality') {
    ctx.fillStyle = 'rgba(255, 230, 200, 0.6)';
    ctx.beginPath();
    ctx.arc(foveaX, foveaY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vascular tree (retinal arteries & veins emerging from optic disc)
  ctx.strokeStyle = '#5a0d06'; // veins
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  function drawVessels(strokeColor, width) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;

    // Superior temporal arcade
    ctx.beginPath();
    ctx.moveTo(discX, discY - 10);
    ctx.bezierCurveTo(discX + 20, 140, 240, 110, 360, 130);
    ctx.stroke();

    // Inferior temporal arcade
    ctx.beginPath();
    ctx.moveTo(discX, discY + 10);
    ctx.bezierCurveTo(discX + 20, 360, 240, 390, 360, 370);
    ctx.stroke();

    // Superior nasal branch
    ctx.beginPath();
    ctx.moveTo(discX - 10, discY - 10);
    ctx.bezierCurveTo(110, 160, 90, 120, 60, 110);
    ctx.stroke();

    // Inferior nasal branch
    ctx.beginPath();
    ctx.moveTo(discX - 10, discY + 10);
    ctx.bezierCurveTo(110, 340, 90, 380, 70, 400);
    ctx.stroke();

    // Small bifurcations
    ctx.lineWidth = Math.max(1, width * 0.6);
    ctx.beginPath();
    ctx.moveTo(250, 120);
    ctx.quadraticCurveTo(280, 100, 320, 80);
    ctx.moveTo(270, 380);
    ctx.quadraticCurveTo(300, 400, 340, 420);
    ctx.moveTo(200, 135);
    ctx.quadraticCurveTo(220, 180, 250, 200);
    ctx.moveTo(200, 365);
    ctx.quadraticCurveTo(220, 320, 250, 300);
    ctx.stroke();
  }

  drawVessels('#520c04', 3.8); // Primary veins
  drawVessels('#b91c1c', 2.2); // Arteries running parallel

  // Lesions injection depending on SRS Grade type
  if (type === 'mild_npdr') {
    // Microaneurysms: isolated tiny deep red pinpoints
    ctx.fillStyle = '#450a0a';
    const spots = [
      [310, 220, 2], [350, 280, 2.5], [290, 300, 2], [380, 230, 2.2], [270, 230, 1.8]
    ];
    spots.forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (type === 'moderate_npdr') {
    // Dot & Blot hemorrhages + Hard exudates (yellow deposits)
    ctx.fillStyle = '#450a0a';
    const hemorrhages = [
      [310, 210, 3.5], [360, 290, 4], [290, 320, 3], [390, 220, 3.8],
      [270, 210, 2.5], [340, 190, 4.5], [320, 310, 3.8], [400, 270, 3.2]
    ];
    hemorrhages.forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Hard exudates (lipid residues, bright yellowish flecks)
    ctx.fillStyle = '#fef08a';
    const exudates = [
      [340, 230, 2.5], [345, 232, 2], [343, 238, 2],
      [355, 240, 2.2], [358, 245, 1.8], [335, 275, 2.2]
    ];
    exudates.forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (type === 'severe_npdr') {
    // 4:2:1 rule lesions: widespread blot hemorrhages in all 4 quadrants, cotton wool spots
    ctx.fillStyle = '#300505';
    for (let i = 0; i < 35; i++) {
      const angle = (i / 35) * Math.PI * 2;
      const dist = 70 + Math.random() * 120;
      const hx = 256 + Math.cos(angle) * dist;
      const hy = 256 + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.ellipse(hx, hy, 4 + Math.random() * 5, 3 + Math.random() * 4, Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }

    // Cotton wool spots (fluffy white-yellow nerve fiber layer micro-infarcts)
    ctx.fillStyle = 'rgba(254, 252, 232, 0.75)';
    const cws = [
      [280, 160, 9, 6], [320, 340, 11, 7], [190, 310, 8, 6], [370, 180, 10, 8]
    ];
    cws.forEach(([x, y, rx, ry]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (type === 'proliferative_dr') {
    // Neovascularization (NVD / NVE) delicate abnormal vessel nets & vitreous bleed
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.2;
    // Fronds over optic disc
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(discX, discY);
      ctx.bezierCurveTo(
        discX + Math.sin(i) * 25, discY + Math.cos(i) * 25,
        discX + Math.sin(i + 1) * 35, discY + Math.cos(i + 1) * 35,
        discX + Math.sin(i * 2) * 45, discY + Math.cos(i * 2) * 45
      );
      ctx.stroke();
    }

    // Preretinal boat-shaped hemorrhage
    ctx.fillStyle = 'rgba(110, 10, 10, 0.88)';
    ctx.beginPath();
    ctx.moveTo(270, 320);
    ctx.lineTo(340, 320);
    ctx.arc(305, 320, 35, 0, Math.PI);
    ctx.closePath();
    ctx.fill();

    // Extensive scattered hemorrhages
    ctx.fillStyle = '#400606';
    for (let i = 0; i < 40; i++) {
      const hx = 180 + Math.random() * 220;
      const hy = 160 + Math.random() * 200;
      ctx.beginPath();
      ctx.arc(hx, hy, 3 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'poor_quality') {
    // Blurry, out of focus, strong glare/reflection artifact
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(280, 230, 90, 60, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Overexposure glare on side
    const glare = ctx.createRadialGradient(400, 100, 10, 400, 100, 140);
    glare.addColorStop(0, 'rgba(255,255,255,0.7)');
    glare.addColorStop(1, 'transparent');
    ctx.fillStyle = glare;
    ctx.fillRect(0, 0, 512, 512);

    // Apply severe blur filter to canvas
    const imgData = ctx.getImageData(0, 0, 512, 512);
    // Darken & wash out
    for (let i = 0; i < imgData.data.length; i += 4) {
      imgData.data[i] = Math.min(255, imgData.data[i] * 0.7 + 50);
      imgData.data[i+1] = Math.min(255, imgData.data[i+1] * 0.7 + 45);
      imgData.data[i+2] = Math.min(255, imgData.data[i+2] * 0.7 + 45);
    }
    ctx.putImageData(imgData, 0, 0);
  }

  ctx.restore();

  // Aperture ring
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 235, 0, Math.PI * 2);
  ctx.stroke();

  return canvas.toDataURL('image/jpeg', 0.92);
}

let cachedSamples = null;

export function getSampleFundusImages() {
  if (cachedSamples) return cachedSamples;

  try {
    cachedSamples = {
      normal: {
        id: 'sample-normal',
        type: 'normal',
        titleKey: 'sampleNormal',
        stage1: 'NO_DR',
        grade: 0,
        gradeLabel: 'None Detected',
        dataUrl: drawFundus('normal'),
        iqaScore: 0.96,
        iqaPass: true,
        iqaDetails: {
          focus: 'Optimal (0.95)',
          illumination: 'Optimal (0.97)',
          fov: 'Complete (45° centered)',
          retinalVisibility: 'Clear'
        }
      },
      mild: {
        id: 'sample-mild',
        type: 'mild_npdr',
        titleKey: 'sampleMild',
        stage1: 'DR_DETECTED',
        grade: 1,
        gradeLabel: 'Mild NPDR',
        dataUrl: drawFundus('mild_npdr'),
        iqaScore: 0.94,
        iqaPass: true,
        iqaDetails: {
          focus: 'Optimal (0.92)',
          illumination: 'Optimal (0.95)',
          fov: 'Complete (45° centered)',
          retinalVisibility: 'Clear'
        }
      },
      moderate: {
        id: 'sample-moderate',
        type: 'moderate_npdr',
        titleKey: 'sampleModerate',
        stage1: 'DR_DETECTED',
        grade: 2,
        gradeLabel: 'Moderate NPDR',
        dataUrl: drawFundus('moderate_npdr'),
        iqaScore: 0.92,
        iqaPass: true,
        iqaDetails: {
          focus: 'Acceptable (0.89)',
          illumination: 'Optimal (0.94)',
          fov: 'Complete (45° centered)',
          retinalVisibility: 'Clear'
        }
      },
      severe: {
        id: 'sample-severe',
        type: 'severe_npdr',
        titleKey: 'sampleSevere',
        stage1: 'DR_DETECTED',
        grade: 3,
        gradeLabel: 'Severe NPDR',
        dataUrl: drawFundus('severe_npdr'),
        iqaScore: 0.93,
        iqaPass: true,
        iqaDetails: {
          focus: 'Optimal (0.93)',
          illumination: 'Optimal (0.92)',
          fov: 'Complete (45° centered)',
          retinalVisibility: 'Clear'
        }
      },
      proliferative: {
        id: 'sample-proliferative',
        type: 'proliferative_dr',
        titleKey: 'samplePDR',
        stage1: 'DR_DETECTED',
        grade: 4,
        gradeLabel: 'Proliferative DR',
        dataUrl: drawFundus('proliferative_dr'),
        iqaScore: 0.95,
        iqaPass: true,
        iqaDetails: {
          focus: 'Optimal (0.96)',
          illumination: 'Optimal (0.93)',
          fov: 'Complete (45° centered)',
          retinalVisibility: 'Clear'
        }
      },
      poorQuality: {
        id: 'sample-poor-quality',
        type: 'poor_quality',
        titleKey: 'samplePoorQuality',
        stage1: null,
        grade: null,
        gradeLabel: null,
        dataUrl: drawFundus('poor_quality'),
        iqaScore: 0.38,
        iqaPass: false,
        iqaDetails: {
          focus: 'Inadequate (0.34 - Excessive Blur)',
          illumination: 'Inadequate (0.42 - Artifact Glare)',
          fov: 'Partial obscuration',
          retinalVisibility: 'Severe loss of microvascular contrast'
        }
      }
    };
  } catch (err) {
    console.error('Error generating sample fundus images:', err);
    cachedSamples = {};
  }

  return cachedSamples;
}
