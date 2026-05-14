precision highp float;

in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uMask;
uniform vec2 uTexel;

void main() {
  float sum = 0.0;
  sum += texture(uMask, vTextureCoord + uTexel * vec2(-1.0, -1.0)).r;
  sum += texture(uMask, vTextureCoord + uTexel * vec2(0.0, -1.0)).r;
  sum += texture(uMask, vTextureCoord + uTexel * vec2(1.0, -1.0)).r;
  sum += texture(uMask, vTextureCoord + uTexel * vec2(-1.0, 0.0)).r;
  sum += texture(uMask, vTextureCoord).r;
  sum += texture(uMask, vTextureCoord + uTexel * vec2(1.0, 0.0)).r;
  sum += texture(uMask, vTextureCoord + uTexel * vec2(-1.0, 1.0)).r;
  sum += texture(uMask, vTextureCoord + uTexel * vec2(0.0, 1.0)).r;
  sum += texture(uMask, vTextureCoord + uTexel * vec2(1.0, 1.0)).r;
  float alpha = sum / 9.0;
  finalColor = vec4(vec3(alpha), 1.0);
}
