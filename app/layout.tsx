import type{Metadata}from'next';import'./globals.css';import{AuthProvider}from'@/components/AuthProvider';
export const metadata:Metadata={title:'Portail Presty',description:'Pilotage des campagnes et prospects Presty'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body><AuthProvider>{children}</AuthProvider></body></html>}
