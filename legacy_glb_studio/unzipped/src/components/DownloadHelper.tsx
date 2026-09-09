export function DownloadHelper() {
  return (
    <div className="absolute bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-gradient-to-br from-orange-900/90 to-red-900/90 backdrop-blur-sm p-4 rounded-xl border border-orange-500/30 shadow-2xl z-10">
      <div className="flex items-start gap-3">
        <div className="text-3xl">💡</div>
        <div className="flex-1">
          <h3 className="text-orange-300 font-bold mb-2">Need Your .glb File?</h3>
          <p className="text-sm text-gray-300 mb-3">
            Download your BBQ Bike model from Google Drive to use with this viewer.
          </p>
          <a
            href="https://drive.google.com/file/d/1La14vaehZp2v-HFm_xSbra0jNrg4swtH/view?usp=drivesdk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-orange-900 font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
          >
            📥 Open Google Drive Link
          </a>
          <p className="text-xs text-gray-400 mt-2">
            Click the download button in Google Drive, then upload here
          </p>
        </div>
      </div>
    </div>
  )
}
