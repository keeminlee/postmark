import { useEffect, useState } from "react";
// subpath import on purpose: the npcts main barrel pulls the viewers module,
// which imports react-leaflet without declaring it (upstream PR candidate)
import { SpatialProvider, SpatialWorld, useSpatial } from "npcts/spatial";
import { configClient, commandClient, imageClient } from "./services";

// bridges the command layer's `enter:` verb to room navigation — doors in
// npcts snap to walls, so free-standing buildings are applications, and
// walking "into" one routes through here
function Teleporter() {
  const { setCurrentRoom, setCharacterPosition } = useSpatial();
  useEffect(() => {
    const onEnter = (e: Event) => {
      const room = (e as CustomEvent<string>).detail;
      setCurrentRoom(room);
      setCharacterPosition(window.innerWidth / 2, window.innerHeight * 0.72);
    };
    window.addEventListener("postmark-enter", onEnter);
    return () => window.removeEventListener("postmark-enter", onEnter);
  }, [setCurrentRoom, setCharacterPosition]);
  return null;
}

export function App() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <SpatialProvider
      configClient={configClient}
      commandClient={commandClient}
      imageClient={imageClient}
      initialRoom="the-town-outside"
      width={size.w}
      height={size.h}
    >
      <Teleporter />
      <SpatialWorld width={size.w} height={size.h} showMinimap={true} showKeyLegend={true} />
    </SpatialProvider>
  );
}
