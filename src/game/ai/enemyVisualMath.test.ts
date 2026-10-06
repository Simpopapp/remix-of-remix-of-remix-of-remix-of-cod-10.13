import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { clampAimPitch, deathQuatSamples, gaitWeights } from "./enemyVisualMath";

describe("gaitWeights", () => {
  it("parado é 100% idle", () => {
    const w = gaitWeights(0);
    expect(w.idle).toBeCloseTo(1);
    expect(w.walk).toBeCloseTo(0);
    expect(w.run).toBeCloseTo(0);
  });

  it("pesos somam 1 em toda a faixa de velocidade", () => {
    for (let speed = 0; speed <= 6; speed += 0.25) {
      const w = gaitWeights(speed);
      expect(w.idle + w.walk + w.run).toBeCloseTo(1, 5);
    }
  });

  it("walk domina em 1,2 m/s", () => {
    const w = gaitWeights(1.2);
    expect(w.walk).toBeGreaterThan(0.9);
    expect(w.run).toBeCloseTo(0);
  });

  it("run domina acima de 3 m/s", () => {
    const w = gaitWeights(4);
    expect(w.run).toBeGreaterThan(0.9);
  });

  it("transição idle→walk→run é monotônica", () => {
    let prevRun = 0;
    for (let speed = 0; speed <= 6; speed += 0.25) {
      const w = gaitWeights(speed);
      expect(w.run).toBeGreaterThanOrEqual(prevRun);
      prevRun = w.run;
    }
  });
});

describe("clampAimPitch", () => {
  it("limita a ±0,6 rad", () => {
    expect(clampAimPitch(-2)).toBeCloseTo(-0.6);
    expect(clampAimPitch(2)).toBeCloseTo(0.6);
    expect(clampAimPitch(0.3)).toBeCloseTo(0.3);
  });
});

describe("deathQuatSamples", () => {
  it("começa na pose base e termina na queda de costas", () => {
    const base = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1.2);
    const { times, quats, duration } = deathQuatSamples(base, 6);
    const first = new THREE.Quaternion(quats[0], quats[1], quats[2], quats[3]);
    const lastN = quats.length;
    const last = new THREE.Quaternion(
      quats[lastN - 4]!,
      quats[lastN - 3]!,
      quats[lastN - 2]!,
      quats[lastN - 1]!,
    );
    expect(first.angleTo(base)).toBeCloseTo(0, 4);
    const fall = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
      .multiply(base);
    expect(last.angleTo(fall)).toBeLessThan(1e-3);
    // duração: 0.8 s com amostras monotônicas
    expect(times[0]).toBe(0);
    for (let i = 1; i < times.length; i++)
      expect(times[i]!).toBeGreaterThan(times[i - 1]!);
    expect(times[times.length - 1]).toBe(duration);
  });
});
