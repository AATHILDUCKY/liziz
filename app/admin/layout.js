// Admin remains zoomable and is excluded from search indexing.
export const metadata = {
  title: "Liziz Admin",
  robots: { index: false, follow: false },
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FDFBF4",
};
export default function AdminSectionLayout({ children }) {
  return children;
}
