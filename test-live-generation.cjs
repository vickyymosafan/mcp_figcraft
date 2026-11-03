const { createNode, batchCommands } = require('./figcraft-client.cjs');

async function buildLiveUI() {
  console.log('[Langkah 3] Mulai live UI/UX generation langsung di kanvas yang terbuka...');

  // 1. Root Frame (1440x900 Desktop)
  const rootRes = await createNode({
    type: 'frame',
    name: 'Desktop - Company Profile (1440px)',
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
    props: {
      fills: ['#0B0F17']
    }
  });
  const rootId = rootRes.id;
  console.log('Created Root Frame, ID:', rootId);

  // 2. Navigation Bar
  const navRes = await createNode({
    type: 'frame',
    name: 'Navigation Bar',
    parent: rootId,
    x: 0,
    y: 0,
    width: 1440,
    height: 80,
    props: {
      fills: ['#111827']
    }
  });
  console.log('Created Navigation Bar, ID:', navRes.id);

  // 3. Brand Logo Text
  await createNode({
    type: 'text',
    name: 'Brand Logo',
    parent: navRes.id,
    x: 80,
    y: 28,
    text: 'TRIDAYA PRECISION // SMART INDUSTRY',
    props: {
      fontSize: 18,
      fontFamily: 'Inter',
      fontWeight: 700,
      fills: ['#60A5FA']
    }
  });

  // 4. Hero Section Card
  const heroRes = await createNode({
    type: 'frame',
    name: 'Hero Showcase Card',
    parent: rootId,
    x: 80,
    y: 140,
    width: 1280,
    height: 480,
    props: {
      fills: ['#1F2937'],
      cornerRadius: 16
    }
  });

  // 5. Hero Headline
  await createNode({
    type: 'text',
    name: 'Hero Headline',
    parent: heroRes.id,
    x: 60,
    y: 60,
    width: 800,
    text: 'Next-Generation Autonomous CNC & Precision Robotics',
    props: {
      fontSize: 36,
      fontFamily: 'Inter',
      fontWeight: 700,
      fills: ['#F9FAFB']
    }
  });

  // 6. Hero Subtitle
  await createNode({
    type: 'text',
    name: 'Hero Subtitle',
    parent: heroRes.id,
    x: 60,
    y: 130,
    width: 700,
    text: 'High-tolerance engineering meets real-time telemetry. Certified ISO 9001 & AS9100 for aerospace & high-speed rail manufacturing.',
    props: {
      fontSize: 16,
      fontFamily: 'Inter',
      fills: ['#9CA3AF']
    }
  });

  // 7. CTA Button
  const btnRes = await createNode({
    type: 'frame',
    name: 'CTA Button // Request RFP',
    parent: heroRes.id,
    x: 60,
    y: 220,
    width: 220,
    height: 52,
    props: {
      fills: ['#3B82F6'],
      cornerRadius: 8
    }
  });

  await createNode({
    type: 'text',
    name: 'Button Label',
    parent: btnRes.id,
    x: 36,
    y: 16,
    text: 'Explore Machinery ➔',
    props: {
      fontSize: 15,
      fontWeight: 600,
      fills: ['#FFFFFF']
    }
  });

  console.log('[Langkah 3] Selesai! Seluruh elemen UI/UX telah berhasil digambar secara live di kanvas FigCraft!');
}

buildLiveUI().catch(console.error);
