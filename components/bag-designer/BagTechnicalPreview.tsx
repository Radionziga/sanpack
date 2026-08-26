'use client';

import { useId, useMemo, useRef, type PointerEvent, type RefObject } from 'react';
import type { BagDesignSpec } from '@/lib/bag-designer/types';
import type { Language } from '@/types';

type Props = {
  spec: BagDesignSpec;
  logoDataUrl: string;
  svgRef: RefObject<SVGSVGElement | null>;
  language: Language;
  onLogoPositionChange: (x: number, y: number) => void;
};

const VIEWBOX_SIZE = 720;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function BagTechnicalPreview({ spec, logoDataUrl, svgRef, language, onLogoPositionChange }: Props) {
  const id = useId().replaceAll(':', '');
  const dragging = useRef(false);
  const labels = language === 'zh'
    ? {
        aria: `宽 ${spec.width} 厘米、高 ${spec.height} 厘米的包装袋示意图`,
        title: '技术示意图', scale: '比例仅供参考', safeZone: '安全印刷区域', logo: '品牌标识位置', unit: '厘米', gusset: '侧褶',
      }
    : {
        aria: `Эскиз ${spec.width} на ${spec.height} сантиметров`,
        title: 'ТЕХНИЧЕСКИЙ ЭСКИЗ', scale: 'масштаб условный', safeZone: 'БЕЗОПАСНАЯ ЗОНА ПЕЧАТИ', logo: 'МЕСТО ДЛЯ ЛОГОТИПА', unit: 'см', gusset: 'складка',
      };

  const geometry = useMemo(() => {
    const maxWidth = 390;
    const maxHeight = 470;
    const scale = Math.min(maxWidth / spec.width, maxHeight / spec.height);
    const width = spec.width * scale;
    const height = spec.height * scale;
    const left = (VIEWBOX_SIZE - width) / 2;
    const right = left + width;
    const top = 98 + (maxHeight - height) / 2;
    const bottom = top + height;
    const handleWidth = clamp(width * 0.2, 42, 82);
    const handleDepth = clamp(height * 0.24, 70, 118);

    const path = spec.bagType === 'tshirt'
      ? [
          `M ${left} ${bottom}`,
          `L ${left} ${top}`,
          `L ${left + handleWidth} ${top}`,
          `L ${left + handleWidth} ${top + handleDepth * 0.58}`,
          `Q ${left + handleWidth} ${top + handleDepth} ${left + handleWidth * 1.55} ${top + handleDepth}`,
          `L ${right - handleWidth * 1.55} ${top + handleDepth}`,
          `Q ${right - handleWidth} ${top + handleDepth} ${right - handleWidth} ${top + handleDepth * 0.58}`,
          `L ${right - handleWidth} ${top}`,
          `L ${right} ${top}`,
          `L ${right} ${bottom}`,
          'Z',
        ].join(' ')
      : `M ${left} ${bottom} L ${left} ${top + 12} Q ${left} ${top} ${left + 12} ${top} H ${right - 12} Q ${right} ${top} ${right} ${top + 12} V ${bottom} Z`;

    const printTop = spec.bagType === 'tshirt' ? top + handleDepth + 18 : top + (spec.bagType === 'die-cut' ? height * 0.22 : height * 0.13);
    const printBottom = bottom - height * 0.11;
    const printLeft = left + width * 0.14;
    const printRight = right - width * 0.14;
    const safeZone = {
      x: printLeft,
      y: printTop,
      width: printRight - printLeft,
      height: Math.max(80, printBottom - printTop),
    };

    return { width, height, left, right, top, bottom, handleDepth, path, safeZone };
  }, [spec.bagType, spec.height, spec.width]);

  const logoWidth = geometry.safeZone.width * (spec.logoScale / 100);
  const logoHeight = Math.min(geometry.safeZone.height * 0.72, logoWidth * 0.48);
  const logoCenterX = geometry.safeZone.x + geometry.safeZone.width * (spec.logoX / 100);
  const logoCenterY = geometry.safeZone.y + geometry.safeZone.height * (spec.logoY / 100);
  const clipId = `bag-clip-${id}`;

  function updateLogoPosition(event: PointerEvent<SVGSVGElement>) {
    if (!dragging.current || !logoDataUrl) return;
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const point = event.currentTarget.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    onLogoPositionChange(
      clamp(((local.x - geometry.safeZone.x) / geometry.safeZone.width) * 100, 4, 96),
      clamp(((local.y - geometry.safeZone.y) / geometry.safeZone.height) * 100, 5, 95),
    );
  }

  function startDragging(event: PointerEvent<SVGSVGElement>) {
    if (!logoDataUrl) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateLogoPosition(event);
  }

  function stopDragging(event: PointerEvent<SVGSVGElement>) {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const measurementColor = '#56615C';
  const seamColor = '#68736E';
  const printColor = '#16829A';
  const technicalFill = '#D5D8D6';

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      role="img"
      aria-label={labels.aria}
      className="mx-auto block h-auto max-h-[610px] w-full touch-none select-none"
      onPointerDown={startDragging}
      onPointerMove={updateLogoPosition}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
    >
      <rect width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill="#F4F5F3" />
      <defs>
        <clipPath id={clipId}><path d={geometry.path} /></clipPath>
      </defs>

      <g data-helper aria-hidden="true">
        <path d="M 62 64 H 658" stroke="#D6DAD7" strokeWidth="1" />
        <text x="62" y="48" fill="#66716C" fontSize="14" fontFamily="Arial, sans-serif">{labels.title}</text>
        <text x="658" y="48" textAnchor="end" fill="#929A96" fontSize="13" fontFamily="Arial, sans-serif">{labels.scale}</text>
      </g>

      <ellipse cx="360" cy={geometry.bottom + 18} rx={geometry.width * 0.42} ry="10" fill="#1F2924" opacity="0.055" />
      <path d={geometry.path} fill={technicalFill} stroke="#4B5550" strokeWidth="2.25" strokeLinejoin="round" />

      <g clipPath={`url(#${clipId})`} aria-hidden="true">
        <path d={`M ${geometry.left + 9} ${geometry.top + 6} V ${geometry.bottom - 8}`} stroke="#FFFFFF" strokeOpacity="0.32" strokeWidth="2" />
        <path d={`M ${geometry.right - 10} ${geometry.top + 6} V ${geometry.bottom - 8}`} stroke="#303A35" strokeOpacity="0.12" strokeWidth="2" />
        <path d={`M ${geometry.left} ${geometry.bottom - 15} H ${geometry.right}`} stroke={seamColor} strokeOpacity="0.72" strokeWidth="1.5" strokeDasharray="6 6" />
        {spec.bagType === 'tshirt' && spec.gusset > 0 ? (
          <>
            <path d={`M ${geometry.left + geometry.width * 0.1} ${geometry.top + geometry.handleDepth} V ${geometry.bottom}`} stroke={seamColor} strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="7 7" />
            <path d={`M ${geometry.right - geometry.width * 0.1} ${geometry.top + geometry.handleDepth} V ${geometry.bottom}`} stroke={seamColor} strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="7 7" />
          </>
        ) : null}
        {spec.bagType === 'flat' ? <path d={`M ${geometry.left} ${geometry.top + 16} H ${geometry.right}`} stroke={seamColor} strokeOpacity="0.65" strokeWidth="1.4" strokeDasharray="6 6" /> : null}
      </g>

      {spec.bagType === 'die-cut' ? (
        <rect
          x={360 - geometry.width * 0.16}
          y={geometry.top + geometry.height * 0.075}
          width={geometry.width * 0.32}
          height={clamp(geometry.height * 0.07, 22, 34)}
          rx="12"
          fill="#F4F5F3"
          stroke="#4B5550"
          strokeWidth="2"
        />
      ) : null}

      <g data-helper aria-hidden="true">
        <rect x={geometry.safeZone.x} y={geometry.safeZone.y} width={geometry.safeZone.width} height={geometry.safeZone.height} rx="4" fill="none" stroke={printColor} strokeWidth="1.5" strokeDasharray="8 7" />
        <text x={geometry.safeZone.x + 8} y={geometry.safeZone.y - 9} fill={printColor} fontSize="12" fontFamily="Arial, sans-serif">{labels.safeZone}</text>
      </g>

      {logoDataUrl ? (
        <image
          href={logoDataUrl}
          x={logoCenterX - logoWidth / 2}
          y={logoCenterY - logoHeight / 2}
          width={logoWidth}
          height={logoHeight}
          preserveAspectRatio="xMidYMid meet"
          transform={`rotate(${spec.logoRotation} ${logoCenterX} ${logoCenterY})`}
          clipPath={`url(#${clipId})`}
          style={{ cursor: 'grab' }}
        />
      ) : (
        <g data-helper aria-hidden="true">
          <rect x={geometry.safeZone.x + 16} y={geometry.safeZone.y + geometry.safeZone.height / 2 - 36} width={geometry.safeZone.width - 32} height="72" rx="4" fill="#FFFFFF" fillOpacity="0.36" stroke="#8D9691" strokeWidth="1.2" strokeDasharray="6 6" />
          <text x="360" y={geometry.safeZone.y + geometry.safeZone.height / 2 + 5} textAnchor="middle" fill="#6D7772" fontSize="14" fontFamily="Arial, sans-serif">{labels.logo}</text>
        </g>
      )}

      <g data-helper fill="none" stroke={measurementColor} strokeWidth="1.25" aria-hidden="true">
        <path d={`M ${geometry.left} ${geometry.bottom + 42} H ${geometry.right}`} />
        <path d={`M ${geometry.left} ${geometry.bottom + 34} V ${geometry.bottom + 50} M ${geometry.right} ${geometry.bottom + 34} V ${geometry.bottom + 50}`} />
        <path d={`M ${geometry.right + 46} ${geometry.top} V ${geometry.bottom}`} />
        <path d={`M ${geometry.right + 38} ${geometry.top} H ${geometry.right + 54} M ${geometry.right + 38} ${geometry.bottom} H ${geometry.right + 54}`} />
      </g>
      <g data-helper fill={measurementColor} fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700" aria-hidden="true">
        <text x="360" y={geometry.bottom + 64} textAnchor="middle">{spec.width} {labels.unit}</text>
        <text x={geometry.right + 67} y={(geometry.top + geometry.bottom) / 2} transform={`rotate(90 ${geometry.right + 67} ${(geometry.top + geometry.bottom) / 2})`} textAnchor="middle">{spec.height} {labels.unit}</text>
        {spec.gusset > 0 ? <text x={geometry.left} y={geometry.top - 18}>{labels.gusset} {spec.gusset} {labels.unit}</text> : null}
      </g>
    </svg>
  );
}
