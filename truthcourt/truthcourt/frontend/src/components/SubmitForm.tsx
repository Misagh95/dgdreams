import { useState } from "react";
import GenLayerSpinner from "./GenLayerSpinner";

interface Props {
  onSubmit: (text: string, urls: string[], bondGen: string) => Promise<void>;
  disabled: boolean;
}

export default function SubmitForm({ onSubmit, disabled }: Props) {
  const [text, setText] = useState("");
  const [urls, setUrls] = useState("");
  const [bond, setBond] = useState("0.1");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (!text.trim() || urlList.length === 0) return;
    await onSubmit(text.trim(), urlList, bond);
    setText("");
    setUrls("");
  };

  return (
    <form className="card" onSubmit={submit}>
      <h2>Post a claim</h2>
      <label>
        Claim
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 'Company X announced product Y on August 1, 2026'"
          rows={2}
          required
        />
      </label>
      <label>
        Evidence URLs (one per line)
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder={"https://example.com/primary-source\nhttps://news.example.org/article"}
          rows={3}
          required
        />
      </label>
      <div className="row">
        <label>
          Bond (GEN)
          <input
            type="number"
            min="0"
            step="0.01"
            value={bond}
            onChange={(e) => setBond(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={disabled} className="primary">
          {disabled ? (
            <>
              <GenLayerSpinner size={15} color="#fff" label="Submitting" />
              Submitting claim…
            </>
          ) : (
            "Submit claim"
          )}
        </button>
      </div>
    </form>
  );
}
