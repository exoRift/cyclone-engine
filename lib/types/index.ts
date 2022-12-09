/** Power levels for permissions */
enum AuthLevel {
  MEMBER,
  ADMIN,
  OWNER
}

/** Parameters of a command guide */
interface GuideOptions {
  color?: number, /** The color of the guide sidebar (Tip: use 0x hex evaluation to use hex colors) */
  fields?: object[] /** The display fields of the menu */
}

export {
  AuthLevel,
  GuideOptions
}
