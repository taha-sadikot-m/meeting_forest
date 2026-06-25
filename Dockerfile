FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Expose port (Render injects PORT at runtime)
EXPOSE 3000

CMD ["bun", "run", "index.ts"]
