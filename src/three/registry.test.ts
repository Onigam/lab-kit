import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PartRegistry } from './registry';

const box = (a: number, b: number) => new THREE.Box3(new THREE.Vector3(a, a, a), new THREE.Vector3(b, b, b));

function line(frame?: THREE.Box3, viewDir?: THREE.Vector3): { reg: PartRegistry; root: THREE.Group } {
  const reg = new PartRegistry();
  const root = new THREE.Group();
  const long = new THREE.Mesh(new THREE.BoxGeometry(200, 1, 1));
  long.position.x = 100;
  root.add(long);
  reg.add('line', long, new THREE.Vector3(0, 10, 0), undefined, { frame, viewDir });
  const other = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  root.add(other);
  reg.add('other', other);
  return { reg, root };
}

describe('a part framed on less than its whole box', () => {
  it('a part with no `frame` is framed on its whole box, as before', () => {
    const { reg } = line();
    expect(reg.frameBounds('line')).toEqual(reg.bounds('line'));
    expect(reg.frameBounds('line').max.x).toBeCloseTo(200);
  });
  it('a `frame` replaces it for `frameBounds`, not for `bounds`', () => {
    const { reg } = line(box(0, 2));
    expect(reg.frameBounds('line')).toEqual(box(0, 2));
    expect(reg.bounds('line').max.x).toBeCloseTo(200);
  });
  it("it follows the part's explode, through a moved parent", () => {
    const { reg, root } = line(box(0, 2));
    root.scale.setScalar(2);
    reg.setFactor('line', 1);
    expect(reg.frameBounds('line')).toEqual(box(0, 2).translate(new THREE.Vector3(0, 20, 0)));
  });
  it('a part shown alone goes back to its whole box', () => {
    const { reg } = line(box(0, 2));
    reg.setDisplay('other', 'hidden');
    expect(reg.frameBounds('line').max.x).toBeCloseTo(200);
  });
  it('keeps its own copies of what it is given', () => {
    const b = box(0, 2);
    const d = new THREE.Vector3(1, 1, 0);
    const { reg } = line(b, d);
    b.max.x = 99;
    d.x = 99;
    expect(reg.get('line')?.frame?.max.x).toBe(2);
    expect(reg.get('line')?.viewDir?.x).toBe(1);
  });
  it('`add` with its four old arguments still works', () => {
    const reg = new PartRegistry();
    const custom = () => {};
    reg.add('a', new THREE.Mesh(new THREE.BoxGeometry()), new THREE.Vector3(1, 0, 0), custom);
    expect(reg.get('a')?.custom).toBe(custom);
    expect(reg.get('a')?.frame).toBeUndefined();
    expect(reg.get('a')?.viewDir).toBeUndefined();
  });
});
