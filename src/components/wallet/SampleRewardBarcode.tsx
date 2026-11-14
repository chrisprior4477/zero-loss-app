import styles from "./wallet-rewards.module.css";

const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw",
  "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn", "*": "nwnnwnwnn",
};

export function SampleRewardBarcode({ value }: { value: string }) {
  const bars = `*${value}*`.split("").flatMap((character, characterIndex) => {
    const pattern = CODE39[character] ?? CODE39["0"];
    return [...pattern.split("").map((width, index) => ({
      dark: index % 2 === 0,
      width: width === "w" ? 3 : 1,
      key: `${characterIndex}-${index}`,
    })), { dark: false, width: 1, key: `${characterIndex}-gap` }];
  });
  return <div className={styles.sampleBarcode} aria-label="Sample reward barcode">
    {bars.map(bar => <span key={bar.key} className={bar.dark ? "bg-[#061630]" : "bg-white"} style={{ width: `${bar.width}px` }} />)}
  </div>;
}
