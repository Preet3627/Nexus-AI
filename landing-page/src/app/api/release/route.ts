import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
      'https://api.github.com/repos/preet3627/Nexus-AI/releases/latest',
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Nexus-AI-Landing-Page',
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch release');
    }

    const release = await response.json();

    return NextResponse.json({
      tag: release.tag_name,
      name: release.name,
      body: release.body,
      html_url: release.html_url,
      published_at: release.published_at,
      assets: release.assets.map((asset: any) => ({
        name: asset.name,
        download_count: asset.download_count,
        browser_download_url: asset.browser_download_url,
        size: asset.size,
      })),
      tarball_url: release.tarball_url,
      zipball_url: release.zipball_url,
    });
  } catch (error) {
    console.error('Error fetching release:', error);
    return NextResponse.json(
      { error: 'Failed to fetch release' },
      { status: 500 }
    );
  }
}
