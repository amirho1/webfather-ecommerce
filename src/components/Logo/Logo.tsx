import Image from 'next/image';

export const Logo = () => {
  return (
    <Image
      alt="Payload Logo"
      className="max-w-37.5 invert dark:invert-0"
      src="https://raw.githubusercontent.com/payloadcms/payload/3.x/packages/payload/src/admin/assets/images/payload-logo-light.svg"
    />
  )
}
