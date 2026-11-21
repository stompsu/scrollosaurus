import { describe, expect, it } from 'vitest';
import { classifyLicense, cleanAuthor, htmlToText, parseCredit } from '@/lib/image-credits';
import { checkImages } from '@/lib/schemas/image-check';
import { imageEntrySchema, type ImageEntry } from '@/lib/schemas/images';

describe('licence policy (ADR-0002 §4)', () => {
  it.each([
    ['Public domain', 'public-domain'],
    ['PD-old-100', 'public-domain'],
    ['CC0', 'cc0'],
    ['CC BY 4.0', 'cc-by'],
    ['CC BY 2.0', 'cc-by'],
    ['CC BY-SA 3.0', 'cc-by-sa'],
    ['CC-BY-SA-4.0', 'cc-by-sa'],
  ])('allows %s', (name, family) => {
    expect(classifyLicense(name)).toBe(family);
  });

  it.each([
    'CC BY-NC 4.0',
    'CC BY-NC-SA 3.0',
    'CC BY-ND 2.0',
    'GFDL',
    'Fair use',
    'All rights reserved',
    '',
  ])('rejects %j', (name) => {
    expect(classifyLicense(name)).toBeUndefined();
  });
});

describe('credit parsing', () => {
  it('turns Commons HTML into plain text', () => {
    expect(
      htmlToText('<a href="//commons.wikimedia.org/wiki/User:X">Jane&nbsp;Doe</a> &amp; <b>Co</b>'),
    ).toBe('Jane Doe & Co');
    expect(htmlToText('Caf&#233; &#x41;')).toBe('Café A');
  });

  it('drops contact details from author names', () => {
    expect(cleanAuthor('Emily Willoughby (emily.a.willoughby@gmail.com)')).toBe('Emily Willoughby');
    expect(cleanAuthor('Petr Menshikov (https://twitter.com/x; https://vk.com/y)')).toBe(
      'Petr Menshikov',
    );
    expect(cleanAuthor('Ripton Scott from Wimbledon, United Kingdom')).toBe(
      'Ripton Scott from Wimbledon, United Kingdom',
    );
    expect(cleanAuthor('Mark Witton (palaeoartist)')).toBe('Mark Witton (palaeoartist)');
  });

  it('reads author, licence and URL', () => {
    expect(
      parseCredit({
        Artist: { value: '<a href="x">Jane Doe</a>' },
        LicenseShortName: { value: 'CC BY-SA 4.0' },
        LicenseUrl: { value: 'http://creativecommons.org/licenses/by-sa/4.0' },
      }),
    ).toEqual({
      author: 'Jane Doe',
      license: 'CC BY-SA 4.0',
      licenseFamily: 'cc-by-sa',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    });
  });

  it('refuses images it cannot credit', () => {
    expect(parseCredit({ LicenseShortName: { value: 'CC BY 4.0' } })).toEqual({
      error: 'no author',
    });
    expect(
      parseCredit({ Artist: { value: 'A' }, LicenseShortName: { value: 'CC BY-NC 4.0' } }),
    ).toEqual({ error: 'licence "CC BY-NC 4.0" is not allowed' });
    expect(
      parseCredit({ Artist: { value: 'A' }, LicenseShortName: { value: 'CC BY 4.0' } }),
    ).toEqual({ error: 'no licence URL' });
  });

  it('allows public domain without a licence URL', () => {
    expect(
      parseCredit({
        Artist: { value: 'Unknown author' },
        LicenseShortName: { value: 'Public domain' },
      }),
    ).toEqual({
      author: 'Unknown author',
      license: 'Public domain',
      licenseFamily: 'public-domain',
    });
  });
});

const entry: ImageEntry = {
  author: 'Jane Doe',
  license: 'CC BY 4.0',
  licenseFamily: 'cc-by',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
  width: 640,
  height: 480,
  widths: [320, 640],
  basename: 'images/0123456789ab',
  placeholder: 'data:image/webp;base64,AAAA',
  fetched: '2026-11-21',
};

describe('the build check', () => {
  const files = new Set(
    ['320', '640'].flatMap((w) => ['avif', 'webp'].map((f) => `images/0123456789ab-${w}.${f}`)),
  );
  const listed = new Map([['File:X.jpg', ['allosaurus']]]);

  it('passes a credited image with all its files', () => {
    expect(checkImages({ listed, manifest: { 'File:X.jpg': entry }, publicFiles: files })).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it('fails a listed image with no credit', () => {
    const { errors } = checkImages({ listed, manifest: {}, publicFiles: files });
    expect(errors).toEqual([expect.stringMatching(/File:X\.jpg \(allosaurus\): no credit/)]);
  });

  it('fails a missing derivative or a licence edited by hand', () => {
    const missing = new Set([...files].filter((f) => !f.endsWith('640.avif')));
    expect(
      checkImages({ listed, manifest: { 'File:X.jpg': entry }, publicFiles: missing }).errors,
    ).toEqual([expect.stringMatching(/missing public\/images\/0123456789ab-640\.avif/)]);
    const nc = { ...entry, license: 'CC BY-NC 4.0' };
    expect(
      checkImages({ listed, manifest: { 'File:X.jpg': nc }, publicFiles: files }).errors,
    ).toEqual([expect.stringMatching(/not allowed/)]);
  });

  it('warns about credits no species uses', () => {
    const { warnings } = checkImages({
      listed: new Map(),
      manifest: { 'File:X.jpg': entry },
      publicFiles: files,
    });
    expect(warnings).toEqual([expect.stringMatching(/no species lists it/)]);
  });

  it('requires a licence URL unless the image is public domain', () => {
    const noUrl: Partial<ImageEntry> = { ...entry };
    delete noUrl.licenseUrl;
    expect(imageEntrySchema.safeParse(noUrl).success).toBe(false);
    expect(
      imageEntrySchema.safeParse({
        ...noUrl,
        license: 'Public domain',
        licenseFamily: 'public-domain',
      }).success,
    ).toBe(true);
  });
});
