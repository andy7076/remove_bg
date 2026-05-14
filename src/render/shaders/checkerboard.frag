precision highp float;

in vec2 vTextureCoord;
out vec4 finalColor;

uniform float uScale;

void main() {
  vec2 grid = floor(vTextureCoord * uScale);
  float cell = mod(grid.x + grid.y, 2.0);
  vec3 a = vec3(0.62, 0.65, 0.70);
  vec3 b = vec3(0.47, 0.50, 0.56);
  finalColor = vec4(mix(a, b, cell), 1.0);
}
