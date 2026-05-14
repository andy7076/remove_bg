precision highp float;

in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uMask;
uniform vec2 uTexel;

void main() {
  float center = texture(uMask, vTextureCoord).r;
  float right = texture(uMask, vTextureCoord + vec2(uTexel.x, 0.0)).r;
  float down = texture(uMask, vTextureCoord + vec2(0.0, uTexel.y)).r;
  float edge = max(abs(center - right), abs(center - down));
  finalColor = vec4(vec3(edge), 1.0);
}
