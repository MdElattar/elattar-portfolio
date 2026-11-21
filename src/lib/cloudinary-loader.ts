type LoaderParams = {
  src: string;
  width: number;
  quality?: number;
};

export default function cloudinaryLoader({ src, width, quality }: LoaderParams) {
  const marker = "/upload/";
  const index = src.indexOf(marker);
  if (index === -1) return src;

  const afterUpload = src.slice(index + marker.length);
  if (/^(f_|q_|w_|c_)/.test(afterUpload)) return src;

  return src.replace(
    marker,
    `/upload/f_auto,q_${quality ?? "auto"},w_${width}/`,
  );
}
