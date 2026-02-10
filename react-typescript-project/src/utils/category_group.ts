export function category_group(category: string): string {
  // Group categories to reduce visual clutter.
  const c = (category || '').toUpperCase();
  if (c.includes('ACTOR') || c.includes('ACTRESS') || c.includes('PERFORMANCE')) return 'Acting';
  if (c.includes('DIRECTING') || c.includes('DIRECTOR')) return 'Directing';
  if (c.includes('WRITING') || c.includes('SCREENPLAY') || c.includes('SCRIPT')) return 'Writing';
  if (c.includes('MUSIC') || c.includes('SONG') || c.includes('SCORE') || c.includes('SOUNDTRACK')) return 'Music';
  if (c.includes('PICTURE') || c.includes('PRODUCTION')) return 'Picture/Production';
  if (
    c.includes('CINEMATOGRAPH') ||
    c.includes('EDITING') ||
    c.includes('VISUAL') ||
    c.includes('SOUND') ||
    c.includes('DESIGN') ||
    c.includes('ART DIRECTION') ||
    c.includes('COSTUME') ||
    c.includes('MAKEUP') ||
    c.includes('HAIR') ||
    c.includes('ANIMAT') ||
    c.includes('DOCUMENTARY') ||
    c.includes('SHORT')
  ) return 'Technical';
  return 'Other';
}
