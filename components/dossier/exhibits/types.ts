/** Contract every case exhibit implements. */
export type ExhibitProps = {
  /**
   * "live" animates while `active` is true. "still" renders one representative, fully static frame
   * (thumbnails on the evidence board, print, reduced motion).
   */
  mode?: "live" | "still"
  /** True while the exhibit is on screen. When false, stop all work: rAF loops, timers, video. */
  active?: boolean
}
