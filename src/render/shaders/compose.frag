precision highp float;

in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uImage;
uniform sampler2D uMask;

void main() {
  vec4 image = texture(uImage, vTextureCoord);
  float alpha = texture(uMask, vTextureCoord).r;
  finalColor = vec4(image.rgb, alpha);
}
