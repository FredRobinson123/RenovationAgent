import { useCallback, useState } from "react";
import { downloadCsvFile, type CsvRow } from "@shared/lib/csv";

type UseCsvDownloadOptions = {
  defaultFilename?: string;
};

type DownloadCsvOptions = {
  filename?: string;
};

export function useCsvDownload(options: UseCsvDownloadOptions = {}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(
    (rows: CsvRow[], downloadOptions: DownloadCsvOptions = {}) => {
      if (!rows.length || isDownloading) {
        return;
      }

      setIsDownloading(true);
      try {
        const filename =
          downloadOptions.filename ??
          options.defaultFilename ??
          `export-${new Date().toISOString().slice(0, 10)}`;
        downloadCsvFile(filename, rows);
      } finally {
        setIsDownloading(false);
      }
    },
    [isDownloading, options.defaultFilename]
  );

  return {
    isDownloading,
    download,
  };
}

