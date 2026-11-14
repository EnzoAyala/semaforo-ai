/** Datos de casas y helper de puerta (sin componentes React). */

export const NORTH_HOUSES = [
  { id: 'n0', position: [-7.5, 0, -10.6], body: '#e7c7a0', roof: '#7a3030', scale: 1 },
  { id: 'n1', position: [-4.2, 0, -11.0], body: '#cfc7b8', roof: '#4a5560', scale: 0.9 },
  { id: 'n2', position: [-0.5, 0, -10.5], body: '#d8b4a0', roof: '#6b3a2a', scale: 1 },
  { id: 'n3', position: [3.4, 0, -10.9], body: '#b9c4b0', roof: '#3f5a45', scale: 1.05 },
  { id: 'n4', position: [7.2, 0, -10.4], body: '#e0c8a8', roof: '#8a3d2f', scale: 0.95 },
];

export const SOUTH_HOUSES = [
  { id: 's0', position: [-7.0, 0, 10.6], body: '#dcc4a8', roof: '#6b3a2a', scale: 1 },
  { id: 's1', position: [-3.6, 0, 10.9], body: '#c8d0c0', roof: '#3f5a45', scale: 0.95 },
  { id: 's2', position: [-0.2, 0, 10.55], body: '#e7c7a0', roof: '#7a3030', scale: 1.05 },
];

export function houseDoor(house, side) {
  const s = house.scale ?? 1;
  const [x, , z] = house.position;
  const doorZ = side === 'north' ? z + 0.95 * s : z - 0.95 * s;
  return [x, 0.55, doorZ];
}
