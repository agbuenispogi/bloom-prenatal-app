import { AppFrame } from "@/components/shell/app-frame";
import { SwBridge } from "@/components/shell/sw-bridge";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppFrame>{children}</AppFrame>
      <SwBridge />
    </>
  );
}
