// 施工示意图：正常输入出图、坐标里没有 NaN，输入不完整时不出图，太密的线会抽稀
import { describe, it, expect } from 'vitest';
import { rebarSvg, rafterSvg, deckSvg, fenceSvg, concreteStairsSvg, gableWallSvg } from './figures';

const clean = (html: string) => {
  expect(html).toContain('<svg');
  expect(html).not.toMatch(/NaN|Infinity|undefined/);
};

describe('施工示意图', () => {
  it('钢筋网：出图；线太多时抽稀并注明', () => {
    clean(rebarSvg(240, 240, 3, 12, { count: 20 }, { count: 20 }, false));
    const big = rebarSvg(1200, 1200, 3, 6, { count: 200 }, { count: 200 }, true);
    clean(big);
    expect(big).toContain('bar drawn');
    expect(big).toContain('lap splices not shown');
    expect((big.match(/class="sb"/g) ?? []).length).toBeLessThan(160);
    expect(rebarSvg(0, 240, 3, 12, { count: 0 }, { count: 20 }, false)).toBe('');
  });

  it('椽子剖面：各种坡度都出图，跨度为 0 不出图', () => {
    for (const pitch of [2, 6, 12]) clean(rafterSvg(288, pitch, 12, 1.5, 144 * (pitch / 12), 200));
    clean(rafterSvg(288, 6, 0, 0, 72, 161));
    expect(rafterSvg(0, 6, 12, 1.5, 0, 0)).toBe('');
  });

  it('露台框架：出图；龙骨不足两根不出图', () => {
    clean(deckSvg(192, 144, 13, 16, 26, 5.5, 0.125));
    expect(deckSvg(192, 144, 1, 16, 26, 5.5, 0.125)).toBe('');
  });

  it('围栏立面：出图；埋深为 0 时不画坑', () => {
    const html = fenceSvg(8, 6, 3, 5.5, 0, 3.5, 10, 3);
    clean(html);
    expect(html).toContain('3 ft deep');
    const shallow = fenceSvg(8, 6, 3, 5.5, 0, 3.5, 10, 0);
    clean(shallow);
    expect(shallow).not.toContain('deep</text>');
    expect(fenceSvg(0, 6, 3, 5.5, 0, 3.5, 10, 2)).toBe('');
  });
});

describe('第二档示意图', () => {
  it('混凝土台阶：有无平台都出图，台阶数为 0 不出图', () => {
    clean(concreteStairsSvg(48, 7, 11, 0, 3));
    const landing = concreteStairsSvg(48, 7, 11, 36, 3);
    clean(landing);
    expect(landing).toContain('Landing');
    expect(concreteStairsSvg(48, 7, 11, 0, 0)).toBe('');
  });

  it('山墙立面：出图；没有山墙不出图', () => {
    clean(gableWallSvg(360, 108, 96, 2));
    expect(gableWallSvg(360, 108, 96, 0)).toBe('');
  });
});
