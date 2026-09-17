import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "relative mx-auto h-[104px] w-[192px] overflow-hidden"
          : "relative mx-auto h-[130px] w-[240px] overflow-hidden"
      }
    >
      <Image
        src="/moneykee-logo.png"
        alt="MoneyKee"
        width={1024}
        height={1024}
        sizes={compact ? "192px" : "240px"}
        className={
          compact
            ? "absolute -left-[10px] -top-[55px] h-[210px] w-[210px] max-w-none"
            : "absolute -left-[13px] -top-[69px] h-[263px] w-[263px] max-w-none"
        }
      />
    </div>
  );
}
