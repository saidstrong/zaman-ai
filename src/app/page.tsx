import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/home-mobile'); // temporary redirect (307)
}