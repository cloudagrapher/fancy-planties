import { renderWithProviders } from "@/test-utils/helpers/render-helpers";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Drawer from "../Drawer";

// Mock createPortal to render in the same container for testing
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  createPortal: (node: any) => node,
}));

describe("Drawer", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div data-testid="drawer-content">Drawer Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body overflow style
    document.body.style.overflow = "unset";
  });

  describe("Basic Rendering", () => {
    it("renders drawer when isOpen is true", () => {
      renderWithProviders(<Drawer {...defaultProps} />);

      expect(screen.getByTestId("drawer-content")).toBeInTheDocument();
    });

    it("does not render drawer when isOpen is false", () => {
      renderWithProviders(<Drawer {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId("drawer-content")).not.toBeInTheDocument();
    });

    it("renders drawer with title", () => {
      renderWithProviders(<Drawer {...defaultProps} title="Test Drawer" />);

      expect(screen.getByText("Test Drawer")).toBeInTheDocument();
    });

    it("renders drawer without title", () => {
      renderWithProviders(<Drawer {...defaultProps} />);

      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });
  });

  describe("Drawer Positions", () => {
    it("renders bottom drawer by default", () => {
      renderWithProviders(<Drawer {...defaultProps} />);

      // Find the drawer container by looking for the fixed positioned element
      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass("bottom-0", "left-0", "right-0");
    });

    it("renders right drawer", () => {
      renderWithProviders(<Drawer {...defaultProps} position="right" />);

      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass("top-0", "right-0", "bottom-0");
    });

    it("renders left drawer", () => {
      renderWithProviders(<Drawer {...defaultProps} position="left" />);

      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass("top-0", "left-0", "bottom-0");
    });

    it("renders top drawer", () => {
      renderWithProviders(<Drawer {...defaultProps} position="top" />);

      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass("top-0", "left-0", "right-0");
    });
  });

  describe("Drawer Heights", () => {
    it("applies auto height by default", () => {
      renderWithProviders(<Drawer {...defaultProps} />);

      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass("max-h-[85vh]");
    });

    it("applies full height", () => {
      renderWithProviders(<Drawer {...defaultProps} height="full" />);

      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass("h-full");
    });

    it("applies half height", () => {
      renderWithProviders(<Drawer {...defaultProps} height="half" />);

      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass("max-h-[50vh]");
    });
  });

  describe("Close Button", () => {
    it("shows close button by default", () => {
      renderWithProviders(<Drawer {...defaultProps} title="Test Drawer" />);

      expect(screen.getByLabelText(/close drawer/i)).toBeInTheDocument();
    });

    it("hides close button when showCloseButton is false", () => {
      renderWithProviders(
        <Drawer {...defaultProps} title="Test Drawer" showCloseButton={false} />
      );

      expect(screen.queryByLabelText(/close drawer/i)).not.toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<Drawer {...defaultProps} title="Test Drawer" />);

      await user.click(screen.getByLabelText(/close drawer/i));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Handle Bar", () => {
    it("shows handle bar for bottom drawer", () => {
      renderWithProviders(<Drawer {...defaultProps} position="bottom" />);

      const handleBar = document.querySelector(
        ".w-12.h-1.bg-gray-300.rounded-full"
      );
      expect(handleBar).toBeInTheDocument();
    });

    it("does not show handle bar for right drawer", () => {
      renderWithProviders(<Drawer {...defaultProps} position="right" />);

      const handleBar = document.querySelector(
        ".w-12.h-1.bg-gray-300.rounded-full"
      );
      expect(handleBar).not.toBeInTheDocument();
    });

    it("does not show handle bar for left drawer", () => {
      renderWithProviders(<Drawer {...defaultProps} position="left" />);

      const handleBar = document.querySelector(
        ".w-12.h-1.bg-gray-300.rounded-full"
      );
      expect(handleBar).not.toBeInTheDocument();
    });

    it("does not show handle bar for top drawer", () => {
      renderWithProviders(<Drawer {...defaultProps} position="top" />);

      const handleBar = document.querySelector(
        ".w-12.h-1.bg-gray-300.rounded-full"
      );
      expect(handleBar).not.toBeInTheDocument();
    });
  });

  describe("Backdrop Interaction", () => {
    it("closes drawer when backdrop is clicked by default", async () => {
      const user = userEvent.setup();
      renderWithProviders(<Drawer {...defaultProps} />);

      const backdrop = document.querySelector(
        ".fixed.inset-0.bg-black.bg-opacity-50"
      );
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("does not close drawer when backdrop is clicked and closeOnBackdropClick is false", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <Drawer {...defaultProps} closeOnBackdropClick={false} />
      );

      const backdrop = document.querySelector(
        ".fixed.inset-0.bg-black.bg-opacity-50"
      );
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it("does not close drawer when clicking on drawer content", async () => {
      const user = userEvent.setup();
      renderWithProviders(<Drawer {...defaultProps} />);

      await user.click(screen.getByTestId("drawer-content"));

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard Interaction", () => {
    it("closes drawer on Escape key by default", async () => {
      const user = userEvent.setup();
      renderWithProviders(<Drawer {...defaultProps} />);

      await user.keyboard("{Escape}");

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("does not close drawer on Escape key when closeOnEscape is false", async () => {
      const user = userEvent.setup();
      renderWithProviders(<Drawer {...defaultProps} closeOnEscape={false} />);

      await user.keyboard("{Escape}");

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it("ignores other keys", async () => {
      const user = userEvent.setup();
      renderWithProviders(<Drawer {...defaultProps} />);

      await user.keyboard("{Enter}");
      await user.keyboard("{Space}");
      await user.keyboard("a");

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe("Body Scroll Management", () => {
    it("prevents body scroll when drawer is open", () => {
      renderWithProviders(<Drawer {...defaultProps} />);

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("restores body scroll when drawer is closed", () => {
      const { rerender } = renderWithProviders(<Drawer {...defaultProps} />);

      expect(document.body.style.overflow).toBe("hidden");

      rerender(<Drawer {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe("unset");
    });

    it("restores body scroll on unmount", () => {
      const { unmount } = renderWithProviders(<Drawer {...defaultProps} />);

      expect(document.body.style.overflow).toBe("hidden");

      unmount();

      expect(document.body.style.overflow).toBe("unset");
    });
  });

  describe("Animation Classes", () => {
    it("applies correct transform classes for bottom drawer when open", () => {
      renderWithProviders(<Drawer {...defaultProps} position="bottom" />);

      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass("translate-y-0");
    });

    it("applies correct transform classes for right drawer when open", () => {
      renderWithProviders(<Drawer {...defaultProps} position="right" />);

      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass("translate-x-0");
    });

    it("applies correct transform classes for left drawer when open", () => {
      renderWithProviders(<Drawer {...defaultProps} position="left" />);

      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass("translate-x-0");
    });

    it("applies correct transform classes for top drawer when open", () => {
      renderWithProviders(<Drawer {...defaultProps} position="top" />);

      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass("translate-y-0");
    });
  });

  describe("Accessibility", () => {
    it("has proper drawer structure", () => {
      renderWithProviders(<Drawer {...defaultProps} title="Test Drawer" />);

      const drawer = screen.getByTestId("drawer-content").closest("div");
      expect(drawer).toBeInTheDocument();
    });

    it("has accessible close button", () => {
      renderWithProviders(<Drawer {...defaultProps} title="Test Drawer" />);

      const closeButton = screen.getByLabelText(/close drawer/i);
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute("aria-label", "Close drawer");
    });

    it("has proper heading when title is provided", () => {
      renderWithProviders(<Drawer {...defaultProps} title="Test Drawer" />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("Test Drawer");
    });
  });

  describe("Component Structure", () => {
    it("has proper drawer container structure", () => {
      renderWithProviders(<Drawer {...defaultProps} />);

      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass("fixed", "bg-white", "shadow-2xl");
    });

    it("applies transition classes", () => {
      renderWithProviders(<Drawer {...defaultProps} />);

      const drawerContainer = document.querySelector(
        ".fixed.bg-white.shadow-2xl"
      );
      expect(drawerContainer).toHaveClass(
        "transition-transform",
        "duration-300",
        "ease-out"
      );
    });
  });
});
