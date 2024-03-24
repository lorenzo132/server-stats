import systemInformation from "systeminformation";

const SEPARATOR = "\n-------------------------------------\n";

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatUptime(uptime: number): string {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export default async function getSystemStats(): Promise<string> {
  let toSendData = "```prolog\n";

  //   CPU Information
  const cpuData = await systemInformation.cpu();
  const currentLoad = await systemInformation.currentLoad();
  toSendData += `CPU: ${cpuData.manufacturer} ${cpuData.brand} (${
    cpuData.speed
  } GHz)\nCPU Usage: ${currentLoad.currentLoad.toFixed(2)}%\n\nCores: ${
    cpuData.physicalCores
  }P | ${cpuData.cores}T`;
  toSendData += SEPARATOR;

  //   Memory Information
  const memory = await systemInformation.mem();
  const memoryLayout = await systemInformation.memLayout();
  toSendData += `Memory (${memoryLayout.length}):\n`;
  toSendData += `Current Usage: ${formatBytes(memory.active, 2)}/${formatBytes(
    memory.total,
    2
  )} | w/ Buffer: ${formatBytes(memory.used, 2)}`;
  toSendData += `\n\nAvailable: ${formatBytes(memory.available, 2)}`;
  toSendData += SEPARATOR;

  // Disk Information
  const disk = await systemInformation.fsSize();
  const diskLayout = await systemInformation.diskLayout();

  const diskUsed = disk.reduce((acc, curr) => acc + curr.used, 0);
  const diskTotal = disk.reduce((acc, curr) => acc + curr.size, 0);
  const diskFree = disk.reduce((acc, curr) => acc + curr.available, 0);

  toSendData += `Disk (${diskLayout.length}):\n`;
  toSendData += `Current Usage: ${formatBytes(diskUsed, 2)}/${formatBytes(
    diskTotal,
    2
  )} | Free: ${formatBytes(diskFree, 2)}`;
  toSendData += SEPARATOR;

  // GPU Information
  const gpu = await systemInformation.graphics();
  toSendData += `GPU (${gpu.controllers.length}):\n`;

  const gpuData: string[] = [];

  gpu.controllers.forEach((controller) => {
    const usedMemory = controller.memoryUsed;
    const totalMemory = controller.vram;

    if (usedMemory) {
      gpuData.push(
        `${controller.model} | Usage: ${usedMemory}MB/${totalMemory}MB`
      );
    } else {
      gpuData.push(`${controller.model} | Total: ${totalMemory}MB`);
    }
  });
  toSendData += gpuData.join("\n");
  toSendData += SEPARATOR;

  // Network Information
  await systemInformation.networkStats();
  await systemInformation.networkStats();
  await systemInformation.networkStats();
  const networkStats = await systemInformation.networkStats();

  const dataTransfer = networkStats.reduce((acc, curr) => acc + curr.tx_sec, 0);
  const dataReceiving = networkStats.reduce(
    (acc, curr) => acc + curr.rx_sec,
    0
  );

  const dataTotalTransfer = networkStats.reduce(
    (acc, curr) => acc + curr.tx_bytes,
    0
  );
  const dataTotalReceiving = networkStats.reduce(
    (acc, curr) => acc + curr.rx_bytes,
    0
  );

  toSendData += `Network (${networkStats.length}):\n`;
  toSendData += `Current Transfer: ${formatBytes(
    dataTransfer,
    2
  )}/s\nCurrent Received: ${formatBytes(
    dataReceiving,
    2
  )}/s\n\nTotal Transferred: ${formatBytes(
    dataTotalTransfer,
    2
  )}\nTotal Received: ${formatBytes(dataTotalReceiving, 2)}`;
  toSendData += SEPARATOR;

  //   Uptime Information
  const time = systemInformation.time();
  toSendData += `Uptime: ${formatUptime(time.uptime)}`;

  toSendData += "```";

  return toSendData;
}
