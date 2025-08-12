FROM oven/bun:1.2.20 AS builder

WORKDIR /app

# Copy package.json and bun.lockb
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application if needed (uncomment if you have a build step)
# RUN bun run build

# Production stage
FROM oven/bun:1.2.20

WORKDIR /app

# Create a non-root user to run the application
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunjs && \
    chown -R bunjs:nodejs /app

# Copy only necessary files from builder stage
COPY --from=builder --chown=bunjs:nodejs /app/package.json /app/bun.lockb ./
COPY --from=builder --chown=bunjs:nodejs /app/index.ts ./
COPY --from=builder --chown=bunjs:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=bunjs:nodejs /app/node_modules ./node_modules

# Expose the port the app runs on
EXPOSE 3000

# Switch to non-root user
USER bunjs

# Command to run the application
CMD ["bun", "run", "index.ts"]
