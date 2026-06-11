import { Metadata } from "next"
import { ToolsClient } from "./ToolsClient"

export const metadata: Metadata = {
  title: "Tools - PlaceTrix",
  description: "Explore AI tools to supercharge your career journey.",
}

export default function ToolsPage() {
  return <ToolsClient />
}
