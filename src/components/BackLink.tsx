import { Text } from "@chakra-ui/react"
import Link from "next/link"

export function BackLink() {
  return (
    <Link href="/" style={{ textDecoration: "none", alignSelf: "flex-start" }}>
      <Text fontSize="sm" color="fg.muted">
        ← Back
      </Text>
    </Link>
  )
}
